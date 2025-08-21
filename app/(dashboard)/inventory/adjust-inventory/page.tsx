"use client";

import { Suspense, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Menu, X } from "lucide-react";
import Loading from "@/app/(dashboard)/loading";
import NewStockForm from "@/components/forms/NewStockForm";
import AdjustStockForm from "@/components/forms/AdjustStockForm";

export const dynamic = "force-dynamic";

const AdjustInventory = () => {
  const [open, setOpen] = useState(false);
  return (
    <Suspense fallback={<Loading />}>
      <div className="w-full">
        <Tabs defaultValue="add-new" className="w-full space-y-6">
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
              <PopoverContent className="w-64 min-h-48 flex flex-col ring-0 bg-white rounded-lg z-50 mr-8">
                <TabsList className="grid w-full grid-cols-1 gap-4">
                  <TabsTrigger
                    value="add-new"
                    className="w-full bg-light-200 py-2 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
                    onClick={() => setOpen(false)}
                  >
                    Add New Stock
                  </TabsTrigger>

                  <TabsTrigger
                    value="existing"
                    className="w-full bg-light-200 py-2 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
                    onClick={() => setOpen(false)}
                  >
                    Adjust Existing Stock
                  </TabsTrigger>
                </TabsList>
              </PopoverContent>
            </Popover>
          </div>

          <TabsList className="sm:grid w-full sm:grid-cols-3 gap-2 hidden">
            <TabsTrigger
              value="add-new"
              className="w-full bg-white py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Add New Stock
            </TabsTrigger>

            <TabsTrigger
              value="existing"
              className="w-full bg-white py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Adjust Existing Stock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add-new">
            <Card className="w-full bg-white py-5">
              <CardContent className="space-y-2">
                <NewStockForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="existing">
            <Card className="w-full bg-white py-5">
              <CardContent className="space-y-2">
                <AdjustStockForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Suspense>
  );
};

export default AdjustInventory;
