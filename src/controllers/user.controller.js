import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"; 
import jwt from "jsonwebtoken"

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

    const refereshAccessToken = asyncHandler(async (req,res) =>{
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if(!incomingRefreshToken)
        {
            throw new ApiError(400,"Refresh token is required")
        }
        
      try {
        const decodedToken =  jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
  
       const user =await  User.findById(decodedToken?._id)
       if(!user)
          {
              throw new ApiError(404,"User not found")
          }
          if(user.refreshToken !== incomingRefreshToken)
          {
              throw new ApiError(401,"referesh token is invalid or expired")
          }
  
          const options ={
              httpOnly:true,
              secure:true
          }
           const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
           return res
              .status(200)
              .cookie("accessToken",accessToken,options)
              .cookie("refreshToken",newRefreshToken,options)
              .json(new ApiResponse(200,{accessToken,newRefreshToken},"Access token generated successfully"))
      } catch (error) {
          throw new ApiError(401,error?.message || "Invalid refresh token")
      }


    })

    const  changeCurrentPassword = asyncHandler(async (req,res) =>{
        const {oldPassword,newPassword} = req.body
        console.log("Old Password:", oldPassword);
        console.log("New Password:", newPassword);    
        const user = await User.findById(req.user?._id)  // may give error 
       const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)
       if(!isPasswordCorrect)
        {
            throw new ApiError(400,"Old password is incorrect")
        }

        user.password = newPassword
        await user.save({validateBeforeSave:false})
        return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
    })

    const getCurrentUser = asyncHandler(async (req,res) =>{
        return res
        .status(200)
        .json(new ApiResponse(200,req.user,"User details fetched successfully"))
    })
    
    const updateAccountDetails = asyncHandler(async (req,res) =>{
        const {fullName,email} = req.body
        if(!fullName && !email)
        {
            throw new ApiError(400,"Atleast one field is required")
        }
       const user = User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullName,
                    email: email
                }
            }, 
            {
                new:true
            }
        ).select("-password -refreshToken")
        return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))
    })
    
    const updateUserAvatar = asyncHandler(async (req,res) =>{
        const avatarLocalPath = req.file?.path
        if(!avatarLocalPath)
        {
            throw new ApiError(400,"Avatar is required")
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        if(!avatar.url)
        {
            throw new ApiError(500,"Failed to upload avatar")
        }
        const user = User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar:avatar.url
                }
            },
            {
                new:true
            }
        ).select("-password -refreshToken")
        return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
    })

    const updateUserCoverImage = asyncHandler(async (req,res) =>{
        const coverImageLocalPath = req.file?.path
        if(!coverImageLocalPath)
            {
                throw new ApiError(400,"Cover image is required")
            }
         const coverImage = await uploadOnCloudinary(coverImageLocalPath)
         if(!coverImage.url)
            {
                throw new ApiError(500,"Failed to upload cover image")
            }
        const user = User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage:coverImage.url
                }
            },
            {
                new:true
            }
        ).select("-password -refreshToken")
        return res.status(200).json(new ApiResponse(200,user,"Cover image updated successfully"))
    })

    export {registerUser,
        loginUser,
        logoutUser,
        refereshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage}