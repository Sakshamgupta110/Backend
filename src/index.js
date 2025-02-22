// require("dotenv").config({path:'./env'});
import dotenv from "dotenv";

import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
});


connectDB()
.then(()=>{
    app.listenn(process.env.PORT || 8000,()=>{
        console.log(`Server is running on port ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.error("Error - mongodb connection failed", error);
    process.exit(1);
});






















/* FIRST APRROACH
import express from "express";
const app=express()

;(async ()=>{
    try {
       await  mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
       app.on("error",(error)=>{
           console.error("Error",error);
           throw error
       })
       app.listen(process.env.PORT,()=>{
           console.log(`Server is running on port ${process.env.PORT}`)
       })
    } catch (error) {
        console.error("Error",error)
        throw err
        
    }
})() // IIFE semicolon at start to avoid common errors
 */