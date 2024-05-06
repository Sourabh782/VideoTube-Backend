import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js" // can call database
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"; // for image upload
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


// access and refresh token
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId); // get user instance

        const accessToken = user.generateAccessToken(); // generate access token
        const refreshToken = user.generateRefreshToken(); // generate refresh token

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // save refresh token to database

        return { // return access and refresh token
            accessToken, refreshToken 
        }

    } catch (e) {
        throw new ApiError(500, "Something went wrong, while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend -- based on user model
    // validate data received, formats of input (non empty)
    // check if user already exist : username, email
    // check for images, check for avatar
    // upload image, avatar to cloudinary, fetch url from cloudinary, check avatar successfully uploaded or not
    // create user object for storing in mongodb
    // send data in db
    // remove password and important fields from response
    // check for user creation, if true return response else error

    const { fullname, email, username, password } = req.body; // get data

    if(fullname === ""){
        throw new ApiError(400, "fullname is required")
    }
    if(password === ""){
        throw new ApiError(400, "password cant be empty");
    }

    // if( // validation
    //     [fullname, email, username, password].some((field)=> field?.trim() === "") // check for if some field is empty so throw error
    // ){
    //     throw new ApiError(400, "all fields are required");
    // }


    const existedUser = await User.findOne({ // checking if user exist or not
        $or: [{ username }, { email }]  // on basis of email and username
    })

    if(existedUser){
        throw new ApiError(409, "username and email must be unique");
    }

    console.log(req.files);
    console.log(req.body);

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverimage?.[0]?.path;

    console.log(avatarLocalPath);
    console.log(coverImageLocalPath); 

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    // database entry
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        avatarid: avatar.public_id,
        coverimage: coverImage?.url || "",
        coverid: coverImage?.public_id,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUSer = await User.findById(user._id).select(  // checking if user created or not
        "-password -refreshToken"
    )

    if(!createdUSer){
        throw new ApiError(500, "something went wrong while registering the user. Try again.") // if user not created
    }

    return res.status(201).json(  // successful entry
        new ApiResponse(201, createdUSer, "User Registered Successfully")
    )
})

const loginUser = asyncHandler( async (req, res) => {
    // take data from req.body
    // take username and email
    // find user/email in database
    // if no user so error -> register
    // if user present compare password
    // if password wrong _> error
    // if password correct -> generate refresh and access tokens
    // send tokens to cookies
    // send response that login successfull

    const {username, password, email } = req.body; // collect data from req.body

    if(!(username || email)){ // if both username and email not present send error
        throw new ApiError(400, "either username or email is required");
    }

    const user = await User.findOne({ // finds either by username or email
        $or: [{ username }, { email }]  // $or mongodb operator finds data on basis of any one entry
    })

    if(!user){  // if database dont contain any user with given username and email
        throw new ApiError(404, "User doesnot exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password); // check password

    if(!isPasswordValid){ // wrong password
        throw new ApiError(401, "invalid user Credentials");
    }

    // generate refresh and access tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // set data in cookies
    const options = {
        httpOnly: true,  // safety option to prevent cookies modifying from frontend
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken, // for user prefrence      
        }, "user Loggedin successfully")
    )

})

const logoutUser = asyncHandler( async (req, res) => {
    // remove cookies
    // remove refreshToken from user model

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // removes data from database
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
    
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    try {
        // collect refresh token from cookies
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
        if(!incomingRefreshToken){
            throw new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options) // name, value, options
        .json(
            new ApiResponse(200, { accessToken, refreshToken: newrefreshToken}, "AccessToken Refreshed")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if(newPassword !== confirmPassword){
        throw new ApiError(400, "Check new password");
    }

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Incorrect old password")
    }

    user.password = newPassword;

    await user.save({validateBeforeSave: false});

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password Changes Successfully"))
})

const getCurrentUser = asyncHandler( async (req, res) => {
    const { user } = req.user;

    return res.status(200)
    .json(new ApiResponse(200, user, "current user fetched"))
})

const updateUserDetails = asyncHandler( async (req, res) => {
    const { fullname, email } = req.body;

    if(!fullname || !email){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res.status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler( async (req, res) => {
    // input avatar
    // check if user is loggedin or not

    const userDetails = await User.findById(req.user._id);

    if(!userDetails){
        throw new ApiError(401, "User not logged in")
    }

    const toDelete = userDetails.avatarid;

    const avatarLocalPath = req.file?.path;
    console.log(avatarLocalPath)

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file not found");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url,
                avatarid: avatar.public_id
            }
        },
        { new : true}
    ).select("-password -refreshToken")

    await deleteFromCloudinary(toDelete);

    return res.status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const userDetails = await User.findById(req.user._id);

    if(!userDetails){
        throw new ApiError(401, "User not logged in")
    }

    const coverImagePath = req.file?.path;

    if(!coverImagePath){
        throw new ApiError(400, "Cover image not found");
    }

    const toDelete = await User.findById(req.user?._id);
    console.log(toDelete.coverid);

    const coverImage = await uploadOnCloudinary(coverImagePath);

    if(!coverImage.url){
        throw new ApiError(400, "Cover image not uploaded");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverimage: coverImage.url,
                coverid: coverImage.public_id
            }
        },
        { 
            new: true 
        }
    ).select("-password -refreshToken")

    deleteFromCloudinary(toDelete.coverid);

    return res.status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"))

})

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const { username } = req.params;

    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    // User.find({ username })
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
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
            $lookup: {
                from:"subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverimage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel doesnot exist");
    }

    console.log(channel[0]);

    return res.status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

const getWatchHistory = asyncHandler( async (req, res) => {
    // when we use req.user._id we get string not mongoDb id, it is done by mongoose to convert out input to proper format
    const user = await User.aggregate([
        {
            $match: {
                // _id: req.user._id  -> error
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        }, 
        {
            $lookup: {
                from: "videos",
                localField: "watchhistory",
                foreignField: "_id",
                as: "watchHistory",

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
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully"))
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar ,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
