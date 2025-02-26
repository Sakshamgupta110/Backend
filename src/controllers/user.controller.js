import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res, next) => {
    // get user details from frontend
    // validation of user details - not empty 
    // check if user already exists in db: username, email
    // check for images and avatar 
    // upload them to cloudinary,avatr 
    //create user object - create entry in db 
    //remove password and referesh token filed from response 
    //check for user creation 
    // return response 
    const {fullName , email , password, userName}=req.body
    console.log("email",email)

    // if(fullName==="")  sperate if else for everything   we can  also use map
    // {
    //     throw new ApiError(400,"Full Name is required")
    // }

    if([fullName,email,password,userName].some((field)=> field?.trim()===""))
    {
        throw new ApiError(400,"All fields are required")
    }

   const existedUser= User.findOne({
        $or:[{userName}  , {email}]
    })
    if(existedUser)
    {
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath =req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar is required")
    }

    //upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(500,"Failed to upload avatar")
    }

    if(!coverImage)
    {
        throw new ApiError(500,"Failed to upload cover image")
    }

   const user = await User.create({
        fullName,
        email,
        password,
        userName:userName.toLowerCase(),
        avatar:avatar.url,
        coverImage:coverImage.url
    })

   const createdUser = await User.findById(user._id).select("-password -refreshToken")
   if(createdUser)
   {
    throw new ApiError(500,"Something when wrong while registering the user")
   }
   
   return res.status(201).json(new ApiResponse(200,createdUser,"User created successfully"))

})


export {registerUser}