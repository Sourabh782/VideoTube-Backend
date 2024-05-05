import { asyncHandler } from "../utils/asyncHandler.js";
import { PlayList } from "../models/playlist.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.model.js"; 
import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist

    const {name, description} = req.body

    if(!(name && description)){
        throw new ApiError(400, "name and description is required");
    }

    const playlist = await PlayList.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!playlist){
        throw new ApiError(500, "something went wrong while creating playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    if(userId.trim() === "" || !isValidObjectId(userId)){
        throw new ApiError(400, "invalid userid")
    }

    const userPlaylist = await PlayList.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id, {})
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideos",

                pipeline: [
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
                owner: 1,
                name: 1,
                description: 1,
                playlistVideos: 1
            }
        }
    ])

    if(!userPlaylist){
        throw new ApiError(500, "something went wrong while fetching playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, userPlaylist, "playlist fetched successfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!playlistId || playlistId.trim() === "" || !isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    const doesExist = await PlayList.findById(playlistId)

    if(!doesExist){
        throw new ApiError(404, "playlist doesnt exist")
    }

    const playlist = await PlayList.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId, {id: 1})
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideos",

                pipeline: [
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
                owner: 1,
                name: 1,
                description: 1,
                playlistVideos: 1
            }
        }
    ])

    if(!playlist){
        throw new ApiError(500, "something went wrong while fetching playlist details")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId || playlistId.trim() === "" || !isValidObjectId(playlistId)){
        throw new ApiError(400, "invalid playlist id")
    }

    if(!videoId || videoId.trim() === "" || !isValidObjectId(videoId)){
        throw new ApiError(400, "invalid video id")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "video not found")
    }

    const playlist = await PlayList.findById(playlistId);

    if(!playlist){
        throw new ApiError(404, "playlist not found");
    }

    let added = true;

    if(!playlist.videos.includes(videoId)){
        const addingVideo = await PlayList.findByIdAndUpdate(playlistId, {
            $addToSet: {
                videos: videoId
            }
        }, {new: true})

        if(!addingVideo){
            added = false;
        }
    }

    if(added){
        return res.status(200).json(
            new ApiResponse(200, [], "Added to playlist")
        )
    } else {
        return res.status(500).json(
            new ApiResponse(500, [], "something went wrong while adding video to playlist")
        )
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!playlistId || playlistId.trim() === "" || !isValidObjectId(playlistId)){
        throw new ApiError(400, "invalid playlist id")
    }

    if(!videoId || videoId.trim() === "" || !isValidObjectId(videoId)){
        throw new ApiError(400, "invalid video id")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "video not found")
    }

    const playlist = await PlayList.findById(playlistId);

    if(!playlist){
        throw new ApiError(404, "playlist not found");
    }

    let removed = true;

    if(playlist.videos.includes(videoId)){
        const removingVideo = await PlayList.findByIdAndUpdate(playlistId, {
            $pull: {
                videos: videoId
            }
        }, {new: true})

        if(!removingVideo){
            removed = false;
        }
    }

    if(removed){
        return res.status(200).json(
            new ApiResponse(200, [], "removed from playlist")
        )
    } else {
        return res.status(500).json(
            new ApiResponse(500, [], "something went wrong while removing video from playlist")
        )
    }

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!playlistId || playlistId.trim() === "" || !isValidObjectId(playlistId)){
        throw new ApiError(400, "invalid playlist id")
    }

    const deleted = await PlayList.findByIdAndDelete(playlistId);

    if(!deleted){
        throw new ApiError(500, "something went wrong while deleting")
    }

    return res.status(200).json(
        new ApiResponse(200, [], "successfully deleted playlist")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!playlistId || playlistId.trim() === "" || !isValidObjectId(playlistId)){
        throw new ApiError(400, "invaid playlist id")
    }

    if(!(name || description)){
        throw new ApiError(400, "either name or description is required");
    }

    const playlist = await PlayList.findById(playlistId);

    if(!playlist){
        throw new ApiError(404, "playlist not found")
    }

    const updatedPlaylist = await PlayList.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name || playlist.name,
                description: description || playlist.description
            }
        },
        {new: true}
    )

    if(!updatedPlaylist){
        throw new ApiError(500, "something went wrong while updating playlist details")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}