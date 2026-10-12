import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required:true,
        minLength:3,
        maxLength:20
    },
    lastName:{
        type:String,
        minLength:3,
        maxLength:20
    },
    emailId:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        immutable:true,
        lowercase:true
    },
    age:{
        type:Number,
        min:5,
        max:80
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    },
    problemSolved:{
        type:[{
            type:Schema.Types.ObjectId,
            ref:'Problem'
        }],
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    hintUsage: [
    {
        problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem" },
        count: { type: Number, default: 0 }
    }
    ]

},{timestamps:true})


userSchema.post('findOneAndDelete' , async function (userInfo) {
    if(userInfo){
        await mongoose.model('submission').deleteMany({userId : userInfo._id})
    }
})

export const User = mongoose.model("User",userSchema)