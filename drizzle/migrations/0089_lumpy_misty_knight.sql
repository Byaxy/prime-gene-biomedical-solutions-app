ALTER TABLE "role_permissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "role_permissions" CASCADE;--> statement-breakpoint
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_name_unique";--> statement-breakpoint
DROP INDEX "permissions_name_idx";--> statement-breakpoint
DROP INDEX "permissions_resource_action_idx";--> statement-breakpoint
DROP INDEX "permissions_active_idx";--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "role_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "route" text NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "route_title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "can_create" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "can_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "can_update" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "can_delete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "permissions_role_id_idx" ON "permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "permissions_route_idx" ON "permissions" USING btree ("route");--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "resource";--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "action";--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "route_path";--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "is_system_permission";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_route_unique" UNIQUE("role_id","route");--> statement-breakpoint
DROP TYPE "public"."app_action";--> statement-breakpoint
DROP TYPE "public"."app_resource";