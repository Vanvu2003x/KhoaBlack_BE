const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.status || 500;
    const message = err.message || "Lỗi server";

    console.error(`[Error] ${statusCode} - ${message}`);
    if (statusCode === 500) {
        console.error(err); // Log full error on 500
    }

    res.status(statusCode).json({
        status: false,
        message: message,
        data: null
    });
};

module.exports = errorMiddleware;
