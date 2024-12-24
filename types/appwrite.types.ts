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
