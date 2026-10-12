import mongoose, { Schema } from "mongoose";

const problemSchema = new Schema({
    title:{
        type:String,
        required:true,
        unique:true,
        trim: true
    },
    description:{
        type:String,
        required:true
    },
    difficultyLevel:{
        type:String,
        enum:['easy','medium','hard'],
        required:true
    },
    tags:{
        type:String,
        enum:['array','linkedList','graph','tree','stack','queue','dp','strings','search'],
        required:true
    },
    visibleTestCases:[
        {
            input:{
                type:String,
                required:true
            },
            output:{
                type:String,
                required:true
            },
            explanation:{
                type:String,
                required:true
            }
        }
    ],
    hiddenTestCases:[
        {
            input:{
                type:String,
                required:true
            },
            output:{
                type:String,
                required:true
            }
        }
    ],
    startCode:[
        {
            language:{
                type:String,
                required:true
            },
            initialCode:{
                type:String,
                required:true
            }
        }
    ],
    referenceSolution:[
        {
            language:{
                type:String,
                required:true
            },
            completeCode:{
                type:String,
                required:true
            }
        }
    ],
    problemCreator:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    }
},{timestamps:true})

export const Problem = mongoose.model("Problem",problemSchema)



//tags: {
//   type: [String],
//   enum: ['array', 'linked list', 'graph', 'tree', 'stack', 'queue', 'dp', 'strings', 'search'],
//   required: true,
//   validate: {
//     validator: function (arr) {
//       return arr.length > 0; // at least one tag required
//     },
//     message: 'At least one tag must be specified'
//   }
// }
