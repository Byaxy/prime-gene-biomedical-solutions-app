"use client";

import { Suspense } from "react";
import Loading from "../loading";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserProfile from "@/components/settings/UserProfile";
import UpdatePassword from "@/components/settings/UpdatePassword";
import CompanySettings from "@/components/settings/CompanySettings";

export const dynamic = "force-dynamic";

const Settings = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div className="w-full max-w-[800px] mx-auto">
        <Tabs defaultValue="company" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 gap-2">
            <TabsTrigger
              value="company"
              className="w-full bg-white py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Company
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="w-full bg-white py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Profile Settings
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="w-full bg-white py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Update Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card className="w-full bg-white py-5">
              <CardContent className="space-y-2">
                <CompanySettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="w-full bg-white py-5">
              <CardContent className="space-y-2">
                <UserProfile />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card className="w-full bg-white py-5">
              <CardContent className="space-y-2">
                <UpdatePassword />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Suspense>
  );
};

export default Settings;
