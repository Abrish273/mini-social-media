const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(express.json()); // Middleware to parse JSON requests

// --- One-to-One: User ↔ Profile ---

// 1. Create a new user with profile
app.post("/users", async (req, res) => {
  const { email, name, bio } = req.body;

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        profile: {
          create: { bio },
        },
      },
      include: { profile: true },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Get a user with their profile
app.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: { profile: true },
    });
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: "User not found" });
  }
});

// 3. Update a user's profile
app.put("/users/:id/profile", async (req, res) => {
  const { id } = req.params;
  const { bio } = req.body;

  try {
    const profile = await prisma.profile.update({
      where: { userId: parseInt(id) },
      data: { bio },
    });
    res.json(profile);
  } catch (error) {
    res.status(404).json({ error: "Profile not found" });
  }
});

// 4. Delete a user and their profile
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.profile.delete({
      where: { userId: parseInt(id) },
    });
    const user = await prisma.user.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "User and profile deleted" });
  } catch (error) {
    res.status(404).json({ error: "User not found" });
  }
});

// --- One-to-Many: User ↔ Posts ---

// 5. Create a post for a user
app.post("/users/:id/posts", async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  console.log("=== ID ===", id);
  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        user: { connect: { id: parseInt(id) } },
      },
    });
    console.log("=== POST ====", post);
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 6. Get all posts for a user
app.get("/users/:id/posts", async (req, res) => {
  const { id } = req.params;

  try {
    const userWithPosts = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: { posts: true },
    });
    res.json(userWithPosts);
  } catch (error) {
    res.status(404).json({ error: "User not found" });
  }
});

// 7. Update a user's post
app.put("/posts/:postId", async (req, res) => {
  const { postId } = req.params;
  const { title, content } = req.body;

  try {
    const post = await prisma.post.update({
      where: { id: parseInt(postId) },
      data: { title, content },
    });
    res.json(post);
  } catch (error) {
    res.status(404).json({ error: "Post not found" });
  }
});

// 8. Delete a user's post
app.delete("/posts/:postId", async (req, res) => {
  const { postId } = req.params;

  try {
    await prisma.post.delete({
      where: { id: parseInt(postId) },
    });
    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(404).json({ error: "Post not found" });
  }
});

// --- Many-to-Many: Post ↔ Categories ---

// 9. Create a category and link it to a post
app.post("/posts/:id/categories", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    const postWithCategory = await prisma.post.update({
      where: { id: parseInt(id) },
      data: {
        categories: {
          connect: { id: category.id },
        },
      },
      include: { categories: true },
    });

    res.status(201).json(postWithCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 10. Get a post with its categories
app.get("/posts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(id) },
      include: { categories: true },
    });
    res.json(post);
  } catch (error) {
    res.status(404).json({ error: "Post not found" });
  }
});

app.put("/posts/:postId/categories", async (req, res) => {
  const { categoriesToAdd, categoriesToRemove } = req.body;

  const post = await prisma.post.update({
    where: { id: parseInt(req.params.postId) },
    data: {
      categories: {
        connect: categoriesToAdd?.map((id) => ({ id })),
        disconnect: categoriesToRemove?.map((id) => ({ id })),
      },
    },
    include: { categories: true },
  });

  res.json(post);
});


// 11. Remove a category from a post
app.delete("/posts/:postId/categories/:categoryId", async (req, res) => {
  const { postId, categoryId } = req.params;

  try {
    const postWithUpdatedCategories = await prisma.post.update({
      where: { id: parseInt(postId) },
      data: {
        categories: {
          disconnect: { id: parseInt(categoryId) },
        },
      },
      include: { categories: true },
    });
    res.json(postWithUpdatedCategories);
  } catch (error) {
    res.status(404).json({ error: "Post or category not found" });
  }
});

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
