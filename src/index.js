// import 'dotenv/config'
import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"


dotenv.config({
    path: "./env"
})

connectDB().then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`App is listening to ${process.env.PORT}`);
    })
}).catch((err)=>{
    console.log("MONGODB connection failed !! ", err)
})



/*
import express from "express"
const app = express();

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.listen(process.env.PORT, ()=>{
            console.log(`App listening on ${process.env.PORT}`);
        })
    } catch (error) {
        console.log(error)
    }
})()

*/