export const authMiddleware = (req, res, next) => {
    const userid = req.headers['x-user-id'];

    if (!userid) {
        const error = new Error('Unauthorized: User ID is required');
        error.status = 401;
        return next(error);
    }

    if(userid === 'reliefAdmin'){
        req.user = {
            id: userid,
            role: 'admin'
        };
    }
    else if(userid === 'netrunnerX'){
        req.user = {
            id: userid,
            role: 'contributor'
        };

    }
    else{
        const error = new Error('Unauthorized: Invalid User ID');
        error.status = 401;
        return next(error);
    }

    next();
}