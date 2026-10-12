import validator from "validator"

const validate= (data) =>{
    const mandatoryField = ['firstName','emailId','password'];

    const IsAllowed = mandatoryField.every((k) => Object.keys(data).includes(k))
    
    if(!IsAllowed){
        throw new Error("Some field Missing");
    }
    if(!validator.isEmail(data.emailId)){
        throw new Error("Invalid Email")
    }
    if(!validator.isStrongPassword(data.password)){
        throw new Error("Enter Strong Password")
    }
}

export default validate