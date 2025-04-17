/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import DatePicker from "react-datepicker";

interface FilterSheetProps {
  filters: {
    [key: string]: {
      type: "text" | "number" | "date" | "select";
      label: string;
      options?: { value: string; label: string }[]; // For select type
    };
  };
  localFilters: Record<string, any>;
  handleLocalFilterChange: (key: string, value: any) => void;
  isFilterDirty: boolean;
  handleClearFilters: () => void;
  handleApplyFilters: () => void;
  filterValues: Record<string, any>;
}

const FiltersSheet = ({
  filters,
  localFilters,
  handleLocalFilterChange,
  isFilterDirty,
  handleApplyFilters,
  handleClearFilters,
  filterValues = {},
}: FilterSheetProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="border-blue-800/60 text-blue-800">
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-light-200 max-w-3xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription></SheetDescription>
        </SheetHeader>
        <div className="py-5">
          <div className="grid grid-cols-1 gap-5">
            {Object.entries(filters).map(([key, filter]) => {
              switch (filter.type) {
                case "text":
                  return (
                    <div key={key} className="space-y-2">
                      <label className="shad-input-label">{filter.label}</label>
                      <Input
                        value={localFilters[key] || ""}
                        onChange={(e) =>
                          handleLocalFilterChange(key, e.target.value)
                        }
                        placeholder={`Filter by ${filter.label}`}
                        className="shad-input"
                      />
                    </div>
                  );
                case "number":
                  return (
                    <div key={key} className="space-y-2">
                      <label className="shad-input-label">{filter.label}</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={localFilters[`${key}_min`] || ""}
                          onChange={(e) =>
                            handleLocalFilterChange(
                              `${key}_min`,
                              e.target.value
                            )
                          }
                          placeholder="Min"
                          className="shad-input"
                        />
                        <Input
                          type="number"
                          value={localFilters[`${key}_max`] || ""}
                          onChange={(e) =>
                            handleLocalFilterChange(
                              `${key}_max`,
                              e.target.value
                            )
                          }
                          placeholder="Max"
                          className="shad-input"
                        />
                      </div>
                    </div>
                  );
                case "date":
                  return (
                    <div key={key} className="space-y-2">
                      <label className="shad-input-label">{filter.label}</label>
                      <div className="flex items-center rounded-md border border-dark-700 bg-white">
                        <DatePicker
                          selected={
                            localFilters[`${key}_start`]
                              ? new Date(localFilters[`${key}_start`])
                              : null
                          }
                          onChange={(date) =>
                            handleLocalFilterChange(
                              `${key}_start`,
                              date ? date.toISOString().split("T")[0] : null
                            )
                          }
                          placeholderText="From"
                          dateFormat={"MM/dd/yyyy"}
                          className="shad-input w-full cursor-pointer px-3 py-2"
                          shouldCloseOnSelect={true}
                          calendarClassName="shadow-lg bg-white border border-gray-200 rounded-md"
                          popperClassName="react-datepicker-popper z-50"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          disabledKeyboardNavigation
                          startDate={
                            localFilters[`${key}_start`]
                              ? new Date(localFilters[`${key}_start`])
                              : undefined
                          }
                          endDate={
                            localFilters[`${key}_end`]
                              ? new Date(localFilters[`${key}_end`])
                              : undefined
                          }
                        />
                      </div>
                      <div className="flex items-center rounded-md border border-dark-700 bg-white">
                        <DatePicker
                          selected={
                            localFilters[`${key}_end`]
                              ? new Date(localFilters[`${key}_end`])
                              : null
                          }
                          onChange={(date) =>
                            handleLocalFilterChange(
                              `${key}_end`,
                              date ? date.toISOString().split("T")[0] : null
                            )
                          }
                          placeholderText="To"
                          dateFormat={"MM/dd/yyyy"}
                          className="shad-input w-full cursor-pointer px-3 py-2"
                          shouldCloseOnSelect={true}
                          calendarClassName="shadow-lg bg-white border border-gray-200 rounded-md"
                          popperClassName="react-datepicker-popper z-50"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          disabledKeyboardNavigation
                          selectsEnd
                          startDate={
                            localFilters[`${key}_start`]
                              ? new Date(localFilters[`${key}_start`])
                              : undefined
                          }
                          endDate={
                            localFilters[`${key}_end`]
                              ? new Date(localFilters[`${key}_end`])
                              : undefined
                          }
                          minDate={
                            localFilters[`${key}_start`]
                              ? new Date(localFilters[`${key}_start`])
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                case "select":
                  return (
                    <div key={key} className="space-y-2">
                      <label className="shad-input-label">{filter.label}</label>
                      <Select
                        value={localFilters[key] || ""}
                        onValueChange={(value) =>
                          handleLocalFilterChange(key, value)
                        }
                      >
                        <SelectTrigger className="w-full shad-select-trigger">
                          <SelectValue placeholder={`Select ${filter.label}`} />
                        </SelectTrigger>
                        <SelectContent className="shad-select-content">
                          {filter.options?.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="cursor-pointer hover:bg-blue-50"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </div>
        <SheetFooter>
          <div className=" w-full flex justify-between gap-2 mt-4">
            <SheetClose asChild>
              <Button
                className="shad-gray-btn"
                onClick={handleClearFilters}
                disabled={
                  !Object.values(filterValues).some(
                    (val) => val !== undefined && val !== ""
                  )
                }
              >
                Clear Filters
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button
                className="shad-primary-btn"
                onClick={handleApplyFilters}
                disabled={!isFilterDirty}
              >
                Apply Filters
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FiltersSheet;
