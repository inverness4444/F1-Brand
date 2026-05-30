-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "colorways" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "designColors" TEXT[] DEFAULT ARRAY[]::TEXT[];
