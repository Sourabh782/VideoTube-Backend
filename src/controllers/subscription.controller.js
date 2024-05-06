import { asyncHandler } from "../utils/asyncHandler.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js"
import mongoose, { isValidObjectId } from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!channelId || channelId.trim()=="" || !isValidObjectId(channelId)){
        throw new ApiError(400, "invalid channel id");
    }

    const isSubscribed = await Subscription.find({
        $and: [{channel: channelId}, {subscriber: new mongoose.Types.ObjectId(req.user?._id, {id: 1})}]
    })

    if(!isSubscribed){
        throw new ApiError(500, "Something went wrong while toggleing")
    }

    if(isSubscribed.length === 0){
        const addToSubscribed = await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        })

        if(!addToSubscribed){
            throw new ApiError("500", "something went wrong while adding to subscribed")
        }

        return res.status(200).json(
            new ApiResponse(200, [], "added to subscribed")
        )
    }
    else {
        const toDelete = await Subscription.findByIdAndDelete(isSubscribed[0]._id);

        if(!toDelete){
            throw new ApiError(500, "something went rong while removing from subscription")
        }

        return res.status(200).json(
            new ApiResponse(200, [], "removed from subscribed")
        )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId || channelId.trim() === "" || !isValidObjectId(channelId)){
        throw new ApiError(400, "invalid channel id")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId, {id: 1})
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",

                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                subscribers: 1
            }
        }
    ])

    if(!subscribers){
        throw new ApiError(500, "something went wrong while fetching subscribers list")
    }

    // console.log(subscribers.length)

    subscribers.push({"size" : subscribers.length})

    return res.status(200).json(
        new ApiResponse(200, subscribers, "subscriber list fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params // subscriber normal person fetching all subscribed channels

    if(!subscriberId || subscriberId.trim() === "" || !isValidObjectId(subscriberId)){
        throw new ApiError(400, "invalid user id")
    }

    const channelList = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId, {id: 1})
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channels",

                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
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
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            coverimage: 1,
                            subscriberCount: 1
                        }
                    }
                ]
            }
        }, 
        {
            $project: {
                channels: 1
            }
        }
    ])

    if(!channelList){
        throw new ApiError(500, "something went wrong while fetching subscribed channel list")
    }

    return res.status(200).json(
        new ApiResponse(200, channelList, "subscribed channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}