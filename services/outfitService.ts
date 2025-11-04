import { db, storage } from "./firebase";

export interface OutfitImage {
    id: string;
    data: string; // This will be the base64 data URI initially, then the storage URL
    mimeType: string;
    angle?: string;
    variationName?: string;
    swatch?: string;
}

export interface PresetOutfit {
    id: string;
    name: string;
    images: OutfitImage[];
    mainImageIndex: number;
}

const TRENDS_COLLECTION = 'trends';

export const getPresetOutfits = async (): Promise<PresetOutfit[]> => {
    try {
        // FIX: Use Firebase v8 syntax for getting documents from a collection
        const snapshot = await db.collection(TRENDS_COLLECTION).get();
        const outfits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresetOutfit));
        return outfits.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Erro ao buscar tendências do Firestore:", error);
        return [];
    }
};

export const addPresetOutfit = async (newOutfitData: Omit<PresetOutfit, 'id'>): Promise<void> => {
    try {
        const uploadedImages = await Promise.all(newOutfitData.images.map(async (image) => {
            if (image.data.startsWith('data:')) {
                const imageName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                // FIX: Use Firebase v8 syntax for storage reference and upload
                const storageRef = storage.ref(`trends/${imageName}`);
                const uploadResult = await storageRef.putString(image.data, 'data_url');
                const downloadURL = await uploadResult.ref.getDownloadURL();
                return { ...image, data: downloadURL };
            }
            return image;
        }));
        
        // FIX: Use Firebase v8 syntax for adding a document
        await db.collection(TRENDS_COLLECTION).add({
            ...newOutfitData,
            images: uploadedImages,
        });
    } catch (error) {
        console.error("Erro ao adicionar nova tendência:", error);
        if (error instanceof Error && (error.name === 'QuotaExceededError' || error.message.includes('storage'))) {
            throw new Error("O armazenamento está cheio. Não é possível salvar mais tendências.");
        }
        throw new Error("Não foi possível adicionar a nova tendência.");
    }
};

export const removePresetOutfit = async (outfit: PresetOutfit): Promise<void> => {
    try {
        await Promise.all(outfit.images.map(async (image) => {
            if (image.data.startsWith('https://firebasestorage.googleapis.com')) {
                try {
                    // FIX: Use Firebase v8 syntax for getting a storage reference from a URL and deleting
                    const imageRef = storage.refFromURL(image.data);
                    await imageRef.delete();
                } catch (error: any) {
                    // Ignore errors for images not found (they might have been manually deleted)
                    if (error.code !== 'storage/object-not-found') {
                        throw error;
                    }
                }
            }
        }));
        // FIX: Use Firebase v8 syntax for deleting a document
        await db.collection(TRENDS_COLLECTION).doc(outfit.id).delete();
    } catch (error) {
        console.error("Erro ao remover tendência:", error);
        throw new Error("Não foi possível remover a tendência.");
    }
};

export const updatePresetOutfit = async (updatedOutfit: PresetOutfit): Promise<void> => {
    try {
        const { id, ...dataToUpdate } = updatedOutfit;
        // FIX: Use Firebase v8 syntax for updating a document
        await db.collection(TRENDS_COLLECTION).doc(id).update(dataToUpdate);
    } catch (error) {
        console.error("Erro ao atualizar tendência:", error);
        throw new Error("Não foi possível atualizar a tendência.");
    }
};