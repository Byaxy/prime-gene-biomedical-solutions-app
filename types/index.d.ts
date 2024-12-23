declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

declare type Gender = "Male" | "Female" | "Other";
declare type Status = "pending" | "scheduled" | "cancelled";

declare interface CreateUserParams {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}
declare interface User extends CreateUserParams {
  $id: string;
}
