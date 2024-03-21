import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js" // can call database
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // for image upload
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


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

    // console.log(req.files);
    // console.log(req.body);

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverimage?.[0]?.path;

    // console.log(avatarLocalPath);
    // console.log(coverImageLocalPath); 


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
        coverimage: coverImage?.url || "",
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
            $set: {
                refreshToken: undefined
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

    const avatarLocalPath = req.file?.path;

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
                avatar: avatar.url
            }
        },
        { new : true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImagePath = req.file?.path;

    if(!coverImagePath){
        throw new ApiError(400, "Cover image not found");
    }

    const coverImage = await uploadOnCloudinary(coverImagePath);

    if(!coverImage.url){
        throw new ApiError(400, "Cover image not uploaded");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverimage: coverImage.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res.status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"))

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
    updateUserCoverImage
}
