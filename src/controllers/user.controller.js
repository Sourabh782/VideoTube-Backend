import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js" // can call database
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // for image upload
import { ApiResponse } from "../utils/apiResponse.js";

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

    // if(fullname === ""){
    //     throw new ApiError(400, "fullname is required")
    // }
    // if(password === ""){
    //     throw new ApiError(400, "password cant be empty");
    // }

    if( // validation
        [fullname, email, username, password].some((field)=> field?.trim() === "") // check for if some field is empty so throw error
    ){
        throw new ApiError(400, "all fields are required")
    }


    const existedUser = User.findOne({ // checking if user exist or not
        $or: [{ email }, { username }]
    })

    if(existedUser){
        throw new ApiError(409, "username and email must be unique");
    }

    console.log(res.files);
    const avatarLocalPath = res.files?.avatar[0]?.path;
    const coverImageLocalPath = res.files?.coverImage[0]?.path;


    if(!avatarLocalPath){
        throw new ApiError(400, "avatar is required");
    }

    const avtar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avtar){
        throw new ApiError(400, "Avtar file is required");
    }

    // database entry
    const user = await User.create({
        fullname,
        avtar: avtar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUSer = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUSer){
        throw new ApiError(500, "something went wrong while registering the user. Try again.")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUSer, "User Registered Successfully")
    )
})

export { registerUser }