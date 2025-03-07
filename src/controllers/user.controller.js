import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"; 


    const generateAccessAndRefreshToken = async (userId) => {
        try {
            const user =await User.findById(userId)
            if(!user)
            {
                throw new ApiError(404,"User not found")
            }
            const accessToken = await user.generateAccessToken();
            const refreshToken = await user.generateRefreshToken();
            user.refreshToken = refreshToken;
            await user.save({ validateBeforeSave: false });
            return {accessToken,refreshToken}

        } catch (error) {
            throw new ApiError(500,"Failed to generate tokens")
        }
    }

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

        if(
            [fullName,email,password,userName].some((field)=> {field?.trim()===""})
        )
        {
            throw new ApiError(400,"All fields are required")
        }

    const existedUser= await User.findOne({
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
    if(!createdUser)
    {
        throw new ApiError(500,"Something when wrong while registering the user")
    }
    
    return res.status(201).json(new ApiResponse(200,createdUser,"User created successfully"))

    })


    const loginUser = asyncHandler(async (req, res) => {
        // req body -> data
        //username or email
        //find the user 
        //password check
        //acess and referesh token
        // send cookies 
        //return response
        const {email,userName ,password} = req.body
        if(!email && !userName)
        {
            throw new ApiError(400,"Email or username is required")
        }
        const user = await User.findOne({
            $or:[{email},{userName}]
        })
        if(!user){
            throw new ApiError(404,"User not found")
        }
       const isPasswordValid = await user.isPasswordCorrect(password)

       if(!isPasswordValid)
       {
           throw new ApiError(401,"Invalid password")
       }

       const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)
       
       const loggedIndUser = await User.findById(user._id).select("-password -refreshToken")
       const options ={
        httpOnly:true,
        secure:true
       }

       return res
       .status(200)
       .cookie("accessToken",accessToken,options)
       .cookie("refreshToken",refreshToken,options)
       .json(new ApiResponse(
        200,
        {
            user:loggedIndUser,
            accessToken,
            refreshToken
        },
        "User logged in successfully"
       )
    )


    })
    const logoutUser = asyncHandler(async (req, res) => {
        User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken:undefined
                }
            },
        {
            new:true
        }
    )
    const options ={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(
        200,
        {},
        "User logged out successfully"))
    })



    export {registerUser,loginUser,logoutUser}