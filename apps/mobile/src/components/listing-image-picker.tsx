import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { LISTING_IMAGE_ACCEPT, uploadListingImageToStorage } from "@repo/utils";
import * as ImagePicker from "expo-image-picker";
import { Button, Label } from "heroui-native";
import { Camera, ImagePlus } from "lucide-react-native";
import { useState, type JSX } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useMutation } from "convex/react";

type ListingImagePickerProps = {
  error?: string;
  initialPreviewUrl?: string | null;
  onChange: (storageId: Id<"_storage"> | null, previewUrl: string | null) => void;
  value: Id<"_storage"> | null;
};

export function ListingImagePicker({
  error,
  initialPreviewUrl = null,
  onChange,
  value,
}: ListingImagePickerProps): JSX.Element {
  const generateUploadUrl = useMutation(api.listings.generateListingImageUploadUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadAsset = async (uri: string, mimeType: string): Promise<void> => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageId = await uploadListingImageToStorage(
        () => generateUploadUrl(),
        blob,
        mimeType || "image/jpeg",
      );
      setPreviewUrl(uri);
      onChange(storageId as Id<"_storage">, uri);
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof Error
          ? uploadFailure.message
          : "Could not upload listing photo",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError("Photo library access is required to add a listing photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await uploadAsset(asset.uri, asset.mimeType ?? "image/jpeg");
  };

  const displayError = uploadError ?? error;

  return (
    <View className="gap-section-title">
      <Label>Listing photo</Label>

      {previewUrl ? (
        <View className="overflow-hidden rounded-xl border border-separator">
          <Image
            accessibilityLabel="Listing preview"
            className="aspect-[4/3] w-full"
            resizeMode="cover"
            source={{ uri: previewUrl }}
          />
          <View className="gap-2 border-t border-separator bg-surface p-3">
            <Button
              isDisabled={isUploading}
              size="sm"
              variant="secondary"
              onPress={() => {
                void pickImage();
              }}
            >
              <Camera color="currentColor" size={16} />
              {isUploading ? "Uploading..." : "Replace photo"}
            </Button>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          className={`aspect-[4/3] items-center justify-center gap-3 rounded-xl border border-dashed border-separator bg-surface px-4 ${
            isUploading ? "opacity-70" : ""
          }`}
          disabled={isUploading}
          onPress={() => {
            void pickImage();
          }}
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-default/45">
            <ImagePlus color="#737373" size={20} />
          </View>
          <View className="items-center gap-1">
            <Text className="text-emphasis text-foreground">
              {isUploading ? "Uploading photo..." : "Add a crop photo"}
            </Text>
            <Text className="text-caption text-muted">
              JPEG, PNG, or WebP up to 5 MB
            </Text>
          </View>
        </Pressable>
      )}

      {displayError ? (
        <Text className="text-caption text-danger">{displayError}</Text>
      ) : null}
    </View>
  );
}
