-- CreateTable
CREATE TABLE "property" (
    "id" SERIAL NOT NULL,
    "street_address" TEXT,
    "zipcode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "building_id" TEXT,
    "listing_status" TEXT,
    "price" DOUBLE PRECISION,
    "display_name" TEXT,
    "business_name" TEXT,
    "phone_number" TEXT,
    "agent_badge_type" TEXT,
    "photo_url" TEXT,
    "profile_url" TEXT,
    "days_on_zillow" INTEGER,
    "updated_first_image" BOOLEAN DEFAULT false,
    "contacted_agent" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_images" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "other_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unstaged_images" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "unstaged_images" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unstaged_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_images" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "other_images" ADD CONSTRAINT "other_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unstaged_images" ADD CONSTRAINT "unstaged_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
