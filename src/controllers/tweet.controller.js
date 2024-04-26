import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createTweet = asyncHandler( async (req, res)=>{
    // receive all data from req
    // check if user is logged in or not : if not so error
    const { content } = req.body;

    if(!content || content.trim() === ""){
        throw new ApiError(400, "provide appropriate content");
    }

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(400, "user not found");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    const createdTweet = await Tweet.findById(tweet._id);

    if(!createTweet){
        throw new ApiError(500, "something went wrong")
    }

    return res.status(201).json(
        new ApiResponse(200, createdTweet, "tweet created successfully")
    )

})

const getAllTweets = asyncHandler( async(req, res)=>{
    const { username } = req.params;

    if(!username.trim()){
        throw new ApiError(404, "username is missing");
    }

    const user = await User.findOne({ username });

    if(!user){
        throw new ApiError(404, "No user found")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user?._id, {_id:1})
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
                            username: 1,
                            avatar: 1,
                            _id: 1,
                            fullname: 1
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
        }, 
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    if(!tweets){
        throw new ApiError(400, "something went wrong while fetching tweets")
    }

    if(tweets.length === 0){
        return res.status(200).json( new ApiResponse(200, [], "Tweets fetched"))
    }

    return res.status(200).json( new ApiResponse(200, tweets, "tweets fetched"));

})

const updateTweet = asyncHandler(async(req, res)=>{
    const { content } = req.body;
    const { tweetId } = req.params;

    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, "invalid tweet id");
    }

    if(!content || content.trim() === 0){
        throw new ApiError(400, "provide valid content");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        }, 
        {
            new: true
        }
    )

    if(!updatedTweet){
        throw new ApiError(500, "something went wrong while updating, try again later");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async(req, res)=>{
    const { tweetId } = req.params;

    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, "invalid tweet id");
    }

    const deleted = await Tweet.findByIdAndDelete(tweetId);

    if(!deleted){
        throw new ApiError(404, "tweet not found");
    }

    return res.status(200).json(
        new ApiResponse(200, deleted, "tweet deleted successfully")
    )
})

export {
    createTweet,
    getAllTweets,
    updateTweet, 
    deleteTweet
}