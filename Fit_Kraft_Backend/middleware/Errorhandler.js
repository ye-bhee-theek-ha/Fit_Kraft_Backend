const {constants}=require("../Constants")
const ErrorHandler = (err, req, res, next) => {
    switch(err.statusCode){
        case constants.NOT_FOUND:
            res.status(constants.NOT_FOUND).json({
                title:"Not Found",
                message:err.message,
                stackTrace:err.stack
            })
        case constants.VALIDATION_ERROR:
            res.status(constants.VALIDATION_ERROR).json({
                title:"Validation Error",
                message:err.message,
                stackTrace:err.stack
            })
        case constants.UNAUTHORIZED:
            res.status(constants.UNAUTHORIZED).json({
                title:"Unauthorized",
                message:err.message,
                stackTrace:err.stack
            })
        case constants.FORBIDDEN:
            res.status(constants.FORBIDDEN).json({
                title:"Forbidden",
                message:err.message,
                stackTrace:err.stack
            })
        case constants.SERVER_ERROR:
            res.status(constants.SERVER_ERROR).json({
                title:"Server Error",
                message:err.message,
                stackTrace:err.stack
            })
        default:
            console.log("No Error, All good !")
            break;
    }

}

module.exports = ErrorHandler;

