"use client";

import Loading from "@/components/loading";
import { useUsers } from "@/hooks/useUsers";
import { useState } from "react";
import { UserFormValues } from "@/lib/validation";
import UserProfileForm from "../forms/UserProfileForm";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";

const UserProfile = () => {
  const { user } = useAuth();
  const { editUser } = useUsers();
  const [isEditing, setIsEditing] = useState(false);
  const { singleUser, isLoading } = useUser(user?.$id ?? "");

  if (isLoading) {
    return <Loading />;
  }

  const onSubmit = async (data: UserFormValues) => {
    setIsEditing(true);
    try {
      if (!singleUser) return;
      await editUser({
        id: singleUser.$id,
        data,
        prevImageId:
          data.image && data.image.length > 0
            ? singleUser.profileImageId
            : undefined,
      });
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsEditing(false);
    }
  };

  if (!singleUser) {
    return null;
  }

  return (
    <div>
      <UserProfileForm
        isAdmin={singleUser.role === "admin"}
        initialData={{
          $id: singleUser.$id,
          name: singleUser.name,
          email: singleUser.email,
          phone: singleUser.phone,
          role: singleUser.role,
          profileImageId: singleUser.profileImageId,
          profileImageUrl: singleUser.profileImageUrl,
          $createdAt: new Date(singleUser.$createdAt),
          $updatedAt: new Date(singleUser.$updatedAt),
        }}
        onSubmit={onSubmit}
        isEditing={isEditing}
      />
    </div>
  );
};

export default UserProfile;
