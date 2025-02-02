// postsController.js
const { createPostSchema } = require('../middlewares/validator');
const Post = require('../models/postsModel');

exports.getPosts = async (req, res) => {
	const { page } = req.query;
	const postsPerPage = 10;

	try {
		let pageNum = 0;
		if (page <= 1) {
			pageNum = 0;
		} else {
			pageNum = page - 1;
		}
		const result = await Post.find()
			.sort({ createdAt: -1 })
			.skip(pageNum * postsPerPage)
			.limit(postsPerPage)
			.populate({
				path: 'userId',
				select: 'email',
			});
		res.status(200).json({ success: true, message: 'posts', data: result });
	} catch (error) {
		console.log(error);
	}
};

exports.singlePost = async (req, res) => {
	const { _id } = req.query;

	try {
		const existingPost = await Post.findOne({ _id }).populate({
			path: 'userId',
			select: 'email',
		});
		if (!existingPost) {
			return res
				.status(404)
				.json({ success: false, message: 'Post unavailable' });
		}
		res
			.status(200)
			.json({ success: true, message: 'single post', data: existingPost });
	} catch (error) {
		console.log(error);
	}
};

exports.createPost = async (req, res) => {
	const { title, description } = req.body;
	const { userId } = req.user;
	try {
		const { error, value } = createPostSchema.validate({
			title,
			description,
			userId,
		});
		if (error) {
			return res
				.status(401)
				.json({ success: false, message: error.details[0].message });
		}

		const result = await Post.create({
			title,
			description,
			userId,
		});
		res.status(201).json({ success: true, message: 'created', data: result });
	} catch (error) {
		console.log(error);
	}
};

exports.updatePost = async (req, res) => {
	const { _id } = req.query;
	const { title, description } = req.body;
	const { userId } = req.user;
	try {
		const { error, value } = createPostSchema.validate({
			title,
			description,
			userId,
		});
		if (error) {
			return res
				.status(401)
				.json({ success: false, message: error.details[0].message });
		}
		const existingPost = await Post.findOne({ _id });
		if (!existingPost) {
			return res
				.status(404)
				.json({ success: false, message: 'Post unavailable' });
		}
		if (existingPost.userId.toString() !== userId) {
			return res.status(403).json({ success: false, message: 'Unauthorized' });
		}
		existingPost.title = title;
		existingPost.description = description;

		const result = await existingPost.save();
		res.status(200).json({ success: true, message: 'Updated', data: result });
	} catch (error) {
		console.log(error);
	}
};

exports.deletePost = async (req, res) => {
	const { _id } = req.query;

	const { userId } = req.user;
	try {
		const existingPost = await Post.findOne({ _id });
		if (!existingPost) {
			return res
				.status(404)
				.json({ success: false, message: 'Post already unavailable' });
		}
		if (existingPost.userId.toString() !== userId) {
			return res.status(403).json({ success: false, message: 'Unauthorized' });
		}

		await Post.deleteOne({ _id });
		res.status(200).json({ success: true, message: 'deleted' });
	} catch (error) {
		console.log(error);
	}

};
exports.searchPatient = async (req, res) => {
	const { healthCard } = req.query;
	console.log("Searching for healthCard:", healthCard);
	try {
		const posts = await Post.find();
		let patient = null;
		posts.forEach(post => {
			try {
				const details = JSON.parse(post.description);
				// Log the stored value and the search query
				//	console.log("Stored healthCard:", details.healthCard, "Search query:", healthCard);
				// Convert both stored and query values to strings, trim, and lower-case before comparing
				if (
					details.healthCard != null &&
					String(details.healthCard).trim().toLowerCase() === String(healthCard).trim().toLowerCase()
				) {
					patient = { ...details, postId: post._id };
				}
			} catch (e) {
				console.error("Error parsing post description:", e);
			}
		});
		if (patient) {
			return res.status(200).json({ success: true, patient });
		} else {
			return res.status(404).json({ success: false, message: 'Patient not found' });
		}
	} catch (err) {
		console.error(err);
		return res.status(500).json({ success: false, message: 'Server error' });
	}
};
