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
        throw new ApiError(400, "all fields are required");
    }


    const existedUser = await User.findOne({ // checking if user exist or not
        $or: [{ email }, { username }]  // on basis of email and username
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

    const createdUSer = await User.findById(user._id).select(  // checking is user created or not
        "-password -refreshToken"
    )

    if(!createdUSer){
        throw new ApiError(500, "something went wrong while registering the user. Try again.") // if user not created
    }

    return res.status(201).json(  // successful entry
        new ApiResponse(201, createdUSer, "User Registered Successfully")
    )
})

export { registerUser }