import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { Button, Input, RTE, Select } from "..";
import appwriteService from "../../appwrite/config";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function PostForm({ post }) {
    const { register, handleSubmit, watch, setValue, control, getValues } = useForm({
        defaultValues: {
            title: post?.title || "",
            slug: post?.$id || "",
            content: post?.content || "",
            status: post?.status || "active",
        },
    });

    const navigate = useNavigate();
    const userData = useSelector((state) => state.auth.userData);

    const submit = async (data) => {
        try {
            let fileId = null;

            // Check if image file exists and upload it
            if (data.image && data.image[0]) {
                const uploadedFile = await appwriteService.uploadFile(data.image[0]);
                if (uploadedFile && uploadedFile.$id) {
                    fileId = uploadedFile.$id;
                } else {
                    console.error("File upload failed.");
                    return;
                }
            }

            if (post) {
                // If updating, delete the old image if a new one is uploaded
                if (fileId && post.featuredImage) {
                    await appwriteService.deleteFile(post.featuredImage);
                }

                const updatedPost = await appwriteService.updatePost(post.$id, {
                    ...data,
                    featuredImage: fileId || post.featuredImage, // Keep old image if no new one
                });

                if (updatedPost) {
                    navigate(`/post/${updatedPost.$id}`);
                }
            } else {
                // Create a new post
                if (!userData || !userData.$id) {
                    console.error("User data is missing or invalid.");
                    return;
                }

                const newPost = await appwriteService.createPost({
                    ...data,
                    featuredImage: fileId,
                    userId: userData.$id,
                });

                if (newPost) {
                    navigate(`/post/${newPost.$id}`);
                }
            }
        } catch (error) {
            console.error("Error in submit function:", error);
        }
    };

    const slugTransform = useCallback((value) => {
        if (!value || typeof value !== "string") return "";
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-zA-Z\d\s]+/g, "-")
            .replace(/\s+/g, "-");
    }, []);

    React.useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === "title") {
                setValue("slug", slugTransform(value.title), { shouldValidate: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [watch, slugTransform, setValue]);

    return (
        <form onSubmit={handleSubmit(submit)} className="flex flex-wrap">
            <div className="w-2/3 px-2">
                <Input
                    label="Title :"
                    placeholder="Title"
                    className="mb-4"
                    {...register("title", { required: true })}
                />
                <Input
                    label="Slug :"
                    placeholder="Slug"
                    className="mb-4"
                    {...register("slug", { required: true })}
                    onInput={(e) => {
                        setValue("slug", slugTransform(e.currentTarget.value), { shouldValidate: true });
                    }}
                />
                <RTE label="Content :" name="content" control={control} defaultValue={getValues("content")} />
            </div>
            <div className="w-1/3 px-2">
                <Input
                    label="Featured Image :"
                    type="file"
                    className="mb-4"
                    accept="image/png, image/jpg, image/jpeg, image/gif"
                    {...register("image", { required: !post })}
                />
                {post?.featuredImage && (
                    <div className="w-full mb-4">
                        <img
                            src={appwriteService.getFilePreview(post.featuredImage)}
                            alt={post.title}
                            className="rounded-lg"
                        />
                    </div>
                )}
                <Select
                    options={["active", "inactive"]}
                    label="Status"
                    className="mb-4"
                    {...register("status", { required: true })}
                />
                <Button type="submit" bgColor={post ? "bg-green-500" : undefined} className="w-full">
                    {post ? "Update" : "Submit"}
                </Button>
            </div>
        </form>
    );
}
