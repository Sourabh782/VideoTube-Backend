import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    
    if(videoId.trim() == 0 || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "video not found");
    }

    const isLiked = await Like.findOne({
        $and: [{video: videoId}, {likedBy: new mongoose.Types.ObjectId(req.user?._id)}]
    })
    

    if(!isLiked){
        const likedVideo = await Like.create({
            video : new mongoose.Types.ObjectId(videoId, {id:1}),
            likedBy : req.user?._id
        })

        if(!likedVideo){
            throw new ApiError(500, "something went wrong while liking video")
        }

        return res.status(200).json(
            new ApiResponse(200, [], "Added to likes video")
        )
    } else {
        const unlikedVideo = await Like.findByIdAndDelete(isLiked._id);

        if(!unlikedVideo){
            throw new ApiError(500, "something went wrong while unliking video")
        }

        return res.status(200).json(
            new ApiResponse(200, [], "Removed from liked video")
        )
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404, "no comment found");
    }

    const alreadyLiked = await Like.findOne({
        $and: [{comment: commentId}, {likedBy: new mongoose.Types.ObjectId(req.user?._id)}]
    })

    console.log(alreadyLiked)

    if(!alreadyLiked){
        const liked = await Like.create({
            comment: new mongoose.Types.ObjectId(commentId),
            likedBy: req.user?._id
        })

        if(!liked){
            throw new ApiError(500, "something went wrong while liking comment")
        }

        return res.status(200).json(
            new ApiResponse(200, [], "Added like to comment")
        )
    } else {
        const unliked = await Like.findByIdAndDelete(alreadyLiked._id)

        if(!unliked){
            throw new ApiError(500, "something went wrong while unliking comment");
        }

        return res.status(200).json(
            new ApiResponse(200, [], "Removed like from comment")
        )
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params; 
    
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, "no tweet found");
    }

    const isLiked = await Like.findOne({
        $and: [{tweet: tweetId}, {likedBy: new mongoose.Types.ObjectId(req.user?._id)}]
    })

    if(!isLiked){
        const liked = await Like.create({
            tweet: new mongoose.Types.ObjectId(tweetId,{}),
            likedBy: req.user?._id
        })

        if(!liked){
            throw new ApiError(500, "something went wrong while adding to liked tweets")
        }

        return res.status(200).json(
            new ApiResponse(200, [], "added like to tweet")
        )
    } else {
        const unliked = await Like.findByIdAndDelete(isLiked?._id);

        if(!unliked){
            throw new ApiError(500, "something went wrong while removing like")
        }

        return res.status(200).json(
            new ApiResponse(200, [], "Removed like from tweet")
        )
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id, {id:1})
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",

                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            desycription: 1,
                            views: 1,
                            owner: 1
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
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
        {
            $project: {
                likedVideos: 1
            }
        }
    ])

    if(!likedVideos){
        throw new ApiError(500, "something went wrong while fetching liked videos")
    }

    return res.status(200).json(
        new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}