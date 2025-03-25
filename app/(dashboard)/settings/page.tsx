"use client";

import { Suspense, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanySettings from "@/components/settings/CompanySettings";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Menu, X } from "lucide-react";
import Loading from "@/components/loading";

export const dynamic = "force-dynamic";

const Settings = () => {
  const [open, setOpen] = useState(false);

  return (
    <Suspense fallback={<Loading />}>
      <div className="w-full">
        <Tabs defaultValue="company" className="w-full space-y-6">
          <div className="sm:hidden w-full">
            <Popover open={open} onOpenChange={setOpen}>
              <div className="w-full flex justify-end">
                <PopoverTrigger asChild>
                  <span className="text-lg">
                    {open ? (
                      <X className="cursor-pointer bg-white w-10 h-10 p-2 rounded-full text-blue-800" />
                    ) : (
                      <Menu className="cursor-pointer bg-white w-10 h-10 p-2 rounded-full text-blue-800" />
                    )}
                  </span>
                </PopoverTrigger>
              </div>
              <PopoverContent className="w-48 min-h-52 flex flex-col ring-0 bg-white rounded-lg z-50 mr-8">
                <TabsList className="grid w-full grid-cols-1 gap-4">
                  <TabsTrigger
                    value="company"
                    className="w-full bg-light-200 py-2 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
                    onClick={() => setOpen(false)}
                  >
                    Company Settings
                  </TabsTrigger>
                </TabsList>
              </PopoverContent>
            </Popover>
          </div>

          <TabsList className="sm:grid w-full sm:grid-cols-3 gap-2 hidden">
            <TabsTrigger
              value="company"
              className="w-full bg-white py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Company Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card className="w-full bg-white py-5">
              <CardContent className="space-y-2">
                <CompanySettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Suspense>
  );
};

export default Settings;
