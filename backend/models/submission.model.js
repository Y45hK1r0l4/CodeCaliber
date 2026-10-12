import mongoose,{Schema } from "mongoose";

const submissionSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    problemId:{
        type:Schema.Types.ObjectId,
        ref:'Problem',
        required:true
    },
    code:{
        type:String,
        required:true
    },
    language:{
        type:String,
        required:true,
        enum:['javascript', 'c++' , 'java' ] //expanded language support
    },
    status:{
        type:String,
        required:true,
        enum:['pending','accepted','wrong','error'],
        default:'pending'
    },
    runtime:{
        type:Number, // millisecond
        default:0
    },
    memory:{
        type:Number , //KB
        default: 0
    },
    errorMessage : {
        type:String,
        default:''
    },
    testCasesPassed:{
        type:Number,
        default:0
    },
    testCasesTotal:{
        type:Number,
        default:0
    },
    failedTestCase:{
        index:{
            type:Number
        },
        input:{
            type:String
        },
        expectedOutput:{
            type:String
        },
        actualOutput:{
            type:String
        },
        error:{
            type:String
        }
    }
},{timestamps:true})

//creating compound index
submissionSchema.index({userId:1 , problemId:1})  

export const Submission = mongoose.model("Submission",submissionSchema)