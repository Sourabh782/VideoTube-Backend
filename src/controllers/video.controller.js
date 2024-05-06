import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { PlayList } from "../models/playlist.model.js";

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    if(!req.user._id){
        throw new ApiError(300, "user not available")
    }

    if(!title || title.trim() === ""){
        throw new ApiError(400, "Invalid title");
    }

    if(!description || description.trim() === ""){
        throw new ApiError(400, "Invalid description")
    }

    console.log(req.files)
    
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    console.log(videoLocalPath)
    console.log(thumbnailLocalPath)

    const uploadedVideo = await uploadOnCloudinary(videoLocalPath);
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!uploadedVideo){
        throw new ApiError(501, "something went wrong while uploading video try again");
    }

    if(!uploadedThumbnail){
        throw new ApiError(501, "something went wrong while uploading thumbnail");
    }

    // console.log(uploadedVideo);
    // console.log(uploadedThumbnail);

    const video = await Video.create({
        videoFile: uploadedVideo.url,
        videoId: uploadedVideo.public_id,
        thumbnail: uploadedThumbnail.url,
        thumbnailId: uploadedThumbnail.public_id,
        title,
        description,
        duration: uploadedVideo.duration,
        owner: req.user?._id
    })

    const createdVideo = await Video.findById(video._id);

    if(!createdVideo){
        throw new ApiError(500, "vidoe cant be uploaded currently try again later");
    }

    // console.log(video);

    return res.status(200).json(
        new ApiResponse(201, createdVideo, "Video uploaded successfully")
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findByIdAndUpdate(videoId, {
        $inc: {views: 1}
    }, {new: true})

    const user = await User.findById(req.user._id, {watchhistory: 1})

    if(!user.watchhistory.includes(videoId)){
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: {
                watchhistory: videoId
            }
        })
    }


    if(!video){
        throw new ApiError(404, "No video found");
    }

    const videoDetails = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId, {id: 1})
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",

                pipeline: [
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullname: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: 1,
                likes: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, videoDetails, "Video fetched")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "video id is invalid")
    }

    if(!req.user._id){
        throw new ApiError(300, "user not available")
    }

    const toUpdate = await Video.findById(videoId)

    if(String(req.user._id) !== String(toUpdate.owner)){
        return res.status(300).json(
            new ApiResponse(300, [], "Unauthorised to take actions")
        )
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const { title, description } = req.body;

    const thumbnailLocalPath = req.file?.path;

    let thumbnail;

    if(thumbnailLocalPath){
        const toDelete = video.thumbnailId;

        await deleteFromCloudinary(toDelete);

        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    }

    const updatedData = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title: title || video.title,
            description: description || video.description,
            thumbnail: thumbnail?.url || video.thumbnail,
            thumbnailId: thumbnail?.public_id || video.thumbnailId
        }
    }, {new: true})

    if(!updatedData){
        throw new ApiError(500, "something went wrong while uploading")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedData, "data updated successfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!req.user._id){
        throw new ApiError(300, "user not available")
    }

    const toDelete = await Video.findById(videoId)

    if(!toDelete){
        throw new ApiError(404, "video not found")
    }

    if(String(req.user._id) !== String(toDelete.owner)){
        return res.status(300).json(
            new ApiResponse(300, [], "Unauthorised to take actions")
        )
    }

    const video = await deleteFromCloudinary(toDelete.videoId, "video");
    const thumbnail = await deleteFromCloudinary(toDelete.thumbnailId);

    if(!video){
        throw new ApiError(500, "cannot delete video try again");
    }
    if(!thumbnail){
        throw new ApiError(500, "cannot delete thumbnail try again");
    }

    await User.updateMany({ watchhistory: videoId }, { $pull: { watchhistory: videoId } })
    await PlayList.updateMany({ videos: videoId }, { $pull: {videos: videoId}})

    const likeDeleted = await Like.deleteMany({video: new mongoose.Types.ObjectId(videoId)})
    const commentDeleted = await Comment.deleteMany({video: new mongoose.Types.ObjectId(videoId)})

    if(!likeDeleted || !commentDeleted){
        throw new ApiError(500, "like or comment not deleted")
    }

    const deleted = await Video.findByIdAndDelete(videoId);

    if(!deleted){
        throw new ApiError(500, "something went wrong and video not deleted")
    }

    return res.status(200).json(
        new ApiResponse(200, [], "Video deleted")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!req.user._id){
        throw new ApiError(300, "user not available")
    }

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(402, "invalid video id");
    }

    const toToggle = await Video.findById(videoId)
    // console.log(currentState)

    if(String(req.user._id) !== String(toToggle.owner)){
        return res.status(300).json(
            new ApiResponse(300, [], "Unauthorised to take actions")
        )
    }


    const updated = await Video.findByIdAndUpdate(videoId, {
        $set: {
            isPublished : !(toToggle?.isPublished)
        }
    }, {new: true})

    if(!updated){
        throw new ApiError(501, "something went wrong while changing state");
    }

    return res.status(200).json(
        new ApiResponse(200, updated, "published state changed")
    )
})

export {
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}