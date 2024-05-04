import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";

const createComment = asyncHandler(async (req, res)=>{
    const { videoId } = req.params;
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const video = Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const { content } = req.body;

    if(!content || content?.trim() == ""){
        throw new ApiError(400, "content field is required");
    }

    const comment = await Comment.create({
        content,
        video: new mongoose.Types.ObjectId(videoId, {id:1}),
        owner: req.user?._id
    })

    if(!comment){
        throw new ApiError(500, "comment cant be created");
    }

    return res.status(200).json(
        new ApiResponse(201, comment, "Comment created successfully")
    )
})

const getVideoComments = asyncHandler(async(req, res)=>{
    const { videoId } = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError("404", "video not found");
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                "likesCount": {
                    $size: "$likes"
                }
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        }
    ])

    if(!comments){
        throw new ApiError(404, "comments not found")
    }

    return res.status(200).json(
        new ApiResponse(200, comments, "comments fetched successfully")
    )
})

const updateComment = asyncHandler(async(req, res)=>{
    const { content } = req.body;

    const { commentId } = req.params;

    if(!content || content.trim() == ""){
        throw new ApiError(402, "content is required");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404, "comment not found");
    }

    if(String(req.user?._id) !== String(comment?.owner)){
        throw new ApiError(300, "Unauthorized to change comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, {
        $set: {
            content
        }
    }, {new: true})

    if(!updatedComment){
        throw new ApiError(500, "something went wrong while updating comment");
    }

    return res.status(200).json(
        new ApiResponse(201, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async(req, res)=>{
    const { commentId } = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "invalid comment id");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404, "comment not found");
    }

    if(String(req.user?._id) !== String(comment.owner)){
        throw new ApiError(300, "Unauthorized to delete comment");
    }

    const deleted = await Comment.findByIdAndDelete(commentId);

    if(!deleted){
        throw new ApiError(500, "Something went wrong while deleting. please try again later");
    }

    const likeDeleted = await Like.deleteMany({comment: new mongoose.Types.ObjectId(commentId)})

    if(!likeDeleted){
        throw new ApiError(500, "something went wrong while deleting like");
    }

    return res.status(200).json(
        new ApiResponse(201, [], "Comment deleted successfully")
    )
})

export {
    createComment,
    getVideoComments,
    updateComment,
    deleteComment
}