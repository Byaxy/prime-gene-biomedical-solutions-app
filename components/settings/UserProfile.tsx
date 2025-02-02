"use client";

import Loading from "@/components/loading";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { Users } from "@/types/appwrite.types";
import { useEffect, useState } from "react";
import { UserFormValues } from "@/lib/validation";
import UserProfileForm from "../forms/UserProfileForm";

const UserProfile = () => {
  const { user } = useAuth();
  const { getUserById, editUser, users } = useUsers();
  const [userData, setUserData] = useState<Users | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !users) return;

      const data = await getUserById(user.$id);
      setUserData(data);
      setLoading(false);
    };

    if (users) {
      fetchUserData();
    }
  }, [user, users, getUserById]);

  if (loading) {
    return <Loading />;
  }

  const onSubmit = async (data: UserFormValues) => {
    setIsEditing(true);
    try {
      if (!userData) return;
      await editUser({
        id: userData.$id,
        data,
        prevImageId:
          data.image && data.image.length > 0
            ? userData.profileImageId
            : undefined,
      });
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsEditing(false);
    }
  };

  if (!userData) {
    return null;
  }

  return (
    <div>
      <UserProfileForm
        isAdmin={userData.role === "admin"}
        initialData={{
          $id: userData.$id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          profileImageId: userData.profileImageId,
          profileImageUrl: userData.profileImageUrl,
          $createdAt: userData.$createdAt,
          $updatedAt: userData.$updatedAt,
        }}
        onSubmit={onSubmit}
        isEditing={isEditing}
      />
    </div>
  );
};

export default UserProfile;
