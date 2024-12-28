/* eslint-disable @typescript-eslint/no-explicit-any */
// Categories
export interface Categories {
  $id: string;
  name: string;
  description: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Product Types
export interface ProductTypes {
  $id: string;
  name: string;
  description: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Materials
export interface Materials {
  $id: string;
  name: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Colors
export interface Colors {
  $id: string;
  name: string;
  code: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Products
export interface Product {
  $id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  categoryId: any;
  typeId: any;
  materialId: any;
  colorId: any;
  $createdAt: Date;
  $updatedAt: Date;
}

// Expenses
export interface Expenses {
  $id: string;
  title: string;
  description: string;
  amount: number;
  expenseDate: Date;
  $createdAt: Date;
  $updatedAt: Date;
}
