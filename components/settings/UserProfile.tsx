"use client";

import Loading from "@/components/loading";
import { useUsers } from "@/hooks/useUsers";
import { UserFormValues } from "@/lib/validation";
import UserProfileForm from "../forms/UserProfileForm";
import { useAuth } from "@/hooks/useAuth";

const UserProfile = () => {
  const { user, isLoading, isAdmin } = useAuth();
  const { editUser, isEditingUser } = useUsers();

  if (isLoading) {
    return <Loading />;
  }

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (!user) return;
      await editUser({
        id: user.id,
        data,
        prevImageId:
          data.image && data.image.length > 0
            ? user.profileImageId ?? undefined
            : undefined,
      });
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <UserProfileForm
        isAdmin={isAdmin}
        initialData={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role,
          profileImageId: user.profileImageId ?? "",
          profileImageUrl: user.profileImageUrl ?? "",
          isActive: user.isActive,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        }}
        onSubmit={onSubmit}
        isEditing={isEditingUser}
      />
    </div>
  );
};

export default UserProfile;
