import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const channelId = req.user?._id;

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    const videoDetails = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(channelId, {id: 1})
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
            }
        },
        {
            $unwind: "$videos"
        },
        {
            $group: {
                _id: "_id",
                totalViews: {
                    $sum: "$videos.views"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $project: {
                totalVideos: 1,
                totalViews: 1
            }
        }
    ])

    // console.log(videoDetails);

    const totalLikes = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId, {id: 1})
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likedVideos"
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $group: {
                _id: "$likedVideos._id"
            }
        },
        {
            $count: "totalLikes"
        }
    ])

    // console.log(totalLikes);

    const totalSubscribers = await User.aggregate([
        {   
            $match: {
                _id: new mongoose.Types.ObjectId(channelId, {id: 1})
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                }
            }
        },
        {
            $project: {
                subscriberCount: 1
            }
        }
    ])

    // console.log(totalSubscribers)

    const obj = {
        totalVideos: videoDetails[0].totalVideos || 0,
        totalViews: videoDetails[0].totalViews || 0,
        totalLikes: totalLikes[0].totalLikes || 0,
        totalSubscribers: totalSubscribers[0].subscriberCount || 0
    }

    // console.log(obj)

    return res.status(200).json(
        new ApiResponse(200, obj, "data fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user?._id;

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "invalid channel id")
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId, {id: 1})
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
                            ownerDetails: {
                                $first: "$owner"
                            }
                        }
                    },
                    {
                        $project: {
                            ownerDetails: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                ownerDetails: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1
            }
        }
    ])

    if(!videos){
        throw new ApiError(500, "something went wrong while fetching videos")
    }

    return res.status(200).json(
        new ApiResponse(200, videos, "all videos fetched successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
}