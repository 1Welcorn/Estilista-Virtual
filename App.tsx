import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, signInWithGoogle, signOut, onAuthChange } from './services/authService';
import { styleModelWithOutfit, generateTrendName, suggestBackgrounds } from './services/geminiService';
// FIX: Removed non-existent 'setProcessedOutfits' import.
import { PresetOutfit, OutfitImage, getPresetOutfits, addPresetOutfit, removePresetOutfit, updatePresetOutfit } from './services/outfitService';
import { fileToBase64, urlToBase64 } from './utils/fileUtils';

// --- SVG ICONS ---
const LoadingSpinnerIcon = ({ text = "" }) => (<div className="flex flex-col justify-center items-center"><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{text && <p className="mt-2 text-lg text-white">{text}</p>}</div>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>);
const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-8 0 4 4 0 018 0zM12 14a7 7 0 01-7-7 7 7 0 0114 0 7 7 0 01-7 7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 01-7-7 7 7 0 0114 0 7 7 0 01-7 7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0-7a7 7 0 005-2.236" /></svg>);
const UserSilhouetteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-12 md:w-12 text-gray-500 group-hover:text-gray-400 transition-colors duration-300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>);
const ClothingIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-12 md:w-12 text-gray-500 group-hover:text-gray-400 transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 009-9h-1.25a7.75 7.75 0 01-15.5 0H3a9 9 0 009 9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12V3m0 0a3.75 3.75 0 00-7.5 0h7.5zM12 3a3.75 3.75 0 017.5 0h-7.5z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>);
const ArrowLeftIcon = ({ className = "h-6 w-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>);
const CheckCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>);
const DownloadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>);
const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>);

// --- MAIN APP COMPONENT ---
function App() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [presetOutfits, setPresetOutfits] = useState<PresetOutfit[]>([]);
    const [isLoadingPresets, setIsLoadingPresets] = useState(true);

    useEffect(() => {
        const initializeApp = async () => {
            onAuthChange(setUser);
            setIsLoadingPresets(true);
            try {
                const outfits = await getPresetOutfits();
                // We don't need to process URLs if they are already base64 in the service
                setPresetOutfits(outfits);
            } catch (error) {
                console.error("Erro ao carregar tendências:", error);
            }
            setIsLoadingPresets(false);
        };
        initializeApp();
    }, []);
    

    const handleLogin = async () => {
        await signInWithGoogle();
    };

    const handleLogout = async () => {
        await signOut();
    };

    const handleUpdatePresets = (updatedPresets: PresetOutfit[]) => {
        setPresetOutfits(updatedPresets);
    };

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans antialiased">
            <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
            <main className="container mx-auto px-4 py-8">
                {user ? (
                    <AdminView initialPresets={presetOutfits} onUpdatePresets={handleUpdatePresets} />
                ) : (
                    <CustomerView presetOutfits={presetOutfits} isLoadingPresets={isLoadingPresets} />
                )}
            </main>
        </div>
    );
}

// --- HEADER & AUTH ---
const Header = ({ user, onLogin, onLogout }: { user: UserProfile | null, onLogin: () => void, onLogout: () => void }) => (
    <header className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-20 flex justify-between items-center">
            <div className="text-2xl font-bold tracking-wider">
                <span className="text-fuchsia-400">Estilista</span>Virtual AI
            </div>
            <div>
                {user ? (
                    <div className="flex items-center gap-4">
                        <span className="text-sm hidden sm:block">Modo Admin</span>
                        <img src={user.picture!} alt={user.name!} className="h-10 w-10 rounded-full border-2 border-fuchsia-500" />
                        <button onClick={onLogout} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Sair</button>
                    </div>
                ) : (
                    <button onClick={onLogin} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                        Login do Admin
                    </button>
                )}
            </div>
        </div>
    </header>
);

// --- CUSTOMER VIEW ---
const CustomerView = ({ presetOutfits, isLoadingPresets }: { presetOutfits: PresetOutfit[], isLoadingPresets: boolean }) => {
    const [modelImage, setModelImage] = useState<{ data: string; mimeType: string } | null>(null);
    const [outfitImage, setOutfitImage] = useState<OutfitImage | null>(null);
    const [activePrompts, setActivePrompts] = useState<string[]>([]);
    const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lookbook, setLookbook] = useState<string[]>([]);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [isOutfitModalOpen, setIsOutfitModalOpen] = useState(false);
    const [selectedTrend, setSelectedTrend] = useState<PresetOutfit | null>(null);

    const showStylingPanel = modelImage && outfitImage;
    
    const handleReset = () => {
        setModelImage(null);
        setOutfitImage(null);
        setActivePrompts([]);
        setSelectedBackground(null);
        setError(null);
    };

    const handleGenerateStyle = async () => {
        if (!modelImage || !outfitImage) {
            setError("Um modelo e uma roupa devem ser selecionados.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const refinementPrompts = activePrompts.join('. ');
            const backgroundPrompt = selectedBackground ? `Set the background to: ${selectedBackground}.` : '';
            const finalPrompt = [refinementPrompts, backgroundPrompt].filter(Boolean).join(' ');

            const styledImage = await styleModelWithOutfit(modelImage, outfitImage, finalPrompt);
            setGeneratedImage(styledImage);
            setIsResultModalOpen(true);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro inesperado durante a geração da imagem.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToLookbook = () => {
        if (generatedImage && !lookbook.includes(generatedImage)) {
            setLookbook([generatedImage, ...lookbook]);
        }
        setIsResultModalOpen(false);
        handleReset();
    };

    const handleCloseResultModal = () => {
      setIsResultModalOpen(false);
      handleReset();
    }

    const handlePresetPromptToggle = (prompt: string) => {
        setActivePrompts(prev => prev.includes(prompt) ? prev.filter(p => p !== prompt) : [...prev, prompt]);
    };

    const handleBackgroundSelect = (prompt: string) => {
        setSelectedBackground(prev => prev === prompt ? null : prompt);
    };
    
    const handleTrendSelect = (trend: PresetOutfit) => {
        setSelectedTrend(trend);
        setIsOutfitModalOpen(true);
    };

    const handleOutfitSelectionComplete = async (image: OutfitImage) => {
        if (!image.data.startsWith('data:')) {
            try {
                const base64Data = await urlToBase64(image.data);
                setOutfitImage({ ...image, data: base64Data });
            } catch (err) {
                setError("Falha ao carregar a imagem da tendência.");
            }
        } else {
            setOutfitImage(image);
        }
        setIsOutfitModalOpen(false);
        setSelectedTrend(null);
    };

    const presetPrompts = [
        "Adicionar uma bolsa estilosa",
        "Trocar sapatos por uns adequados",
        "Deixar a roupa mais ajustada",
        "Dar um novo penteado ousado ao modelo"
    ];

    const backgroundOptions = [
        { label: "Estúdio", prompt: "Um estúdio minimalista com fundo cinza claro" },
        { label: "Urbano Noturno", prompt: "Uma rua urbana à noite com luzes de neon" },
        { label: "Praia Ensolarada", prompt: "Uma praia serena e ensolarada com água turquesa" },
        { label: "Interior Moderno", prompt: "Um interior luxuoso e moderno com linhas retas" },
        { label: "Jardim Botânico", prompt: "Um jardim botânico exuberante e verde" },
        { label: "Fundo Adaptável", prompt: "Um fundo de cor sólida que complementa ou contrasta com as cores da roupa para destacá-la." }
    ];

    return (
        <div className="space-y-12">
            {isOutfitModalOpen && selectedTrend && (
                <OutfitDetailModal trend={selectedTrend} onClose={() => setIsOutfitModalOpen(false)} onSelect={handleOutfitSelectionComplete} />
            )}
            {isResultModalOpen && generatedImage && (
                <ResultModal image={generatedImage} onClose={handleCloseResultModal} onSave={handleSaveToLookbook} />
            )}

            <DualImageUploader
                modelImage={modelImage}
                onModelSelect={setModelImage}
                outfitImage={outfitImage}
                setOutfitImage={setOutfitImage}
            />

            {showStylingPanel && (
                <div className="p-6 bg-gray-800 rounded-lg space-y-6 animate-fade-in">
                    <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-fuchsia-400">Refine Seu Estilo</h3>
                        <div className="overflow-x-auto pb-2 -mb-2">
                           <div className="flex space-x-2 w-max">
                              {presetPrompts.map(prompt => (
                                  <button key={prompt} onClick={() => handlePresetPromptToggle(prompt)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors border-2 ${activePrompts.includes(prompt) ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'bg-gray-700 border-gray-600 hover:border-fuchsia-500'}`}>
                                      {prompt}
                                  </button>
                              ))}
                           </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 pt-6 space-y-3">
                        <h3 className="text-xl font-semibold text-fuchsia-400">Selecione um Fundo</h3>
                        <div className="overflow-x-auto pb-2 -mb-2">
                            <div className="flex space-x-2 w-max">
                                {backgroundOptions.map(({ label, prompt }) => (
                                    <button key={label} onClick={() => handleBackgroundSelect(prompt)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors border-2 ${selectedBackground === prompt ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'bg-gray-700 border-gray-600 hover:border-fuchsia-500'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-gray-700">
                        <button onClick={handleGenerateStyle} disabled={isLoading} className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <LoadingSpinnerIcon /> : '✨ Combinar & Estilizar'}
                        </button>
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    </div>
                </div>
            )}

            <PresetOutfits outfits={presetOutfits} onSelect={handleTrendSelect} isLoading={isLoadingPresets} />
            {lookbook.length > 0 && <MyStyleLookbook images={lookbook} setImages={setLookbook} />}
        </div>
    );
};

// --- CUSTOMER VIEW COMPONENTS ---
const DualImageUploader = ({ modelImage, onModelSelect, outfitImage, setOutfitImage }: { modelImage: { data: string; mimeType: string } | null, onModelSelect: (img: { data: string; mimeType: string } | null) => void, outfitImage: OutfitImage | null, setOutfitImage: (img: OutfitImage | null) => void }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropZone
                title="1. Envie um Modelo"
                onImageSelect={onModelSelect}
                currentImage={modelImage}
                id="model-upload"
                icon={<UserSilhouetteIcon />}
            />
            <DropZone
                title="2. Envie uma Roupa"
                onImageSelect={(img) => setOutfitImage(img ? { ...img, id: `user-${Date.now()}` } as OutfitImage : null)}
                currentImage={outfitImage}
                id="outfit-upload"
                icon={<ClothingIcon />}
            />
        </div>
    );
};

const DropZone = React.forwardRef<HTMLInputElement, { title: string, onImageSelect: (img: { data: string, mimeType: string } | null) => void, currentImage: { data: string } | null, id: string, icon: React.ReactNode }>(({ title, onImageSelect, currentImage, id, icon }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const internalRef = useRef<HTMLInputElement>(null);
    const fileInputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;
    
    const handleFile = async (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const data = await fileToBase64(file);
            onImageSelect({ data, mimeType: file.type });
        } else {
            onImageSelect(null);
        }
    };

    const onDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(false); };
    const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); };
    const onDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0] ?? null);
    };
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files?.[0] ?? null);
    };

    return (
        <label
            htmlFor={id}
            onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
            className={`group relative bg-gray-800/50 rounded-xl flex items-center justify-center h-48 w-full cursor-pointer transition-all duration-300 overflow-hidden border-2 ${isDragging ? 'border-fuchsia-500 ring-2 ring-fuchsia-500 ring-offset-4 ring-offset-gray-900' : 'border-dashed border-gray-600 hover:border-fuchsia-500'} shadow-inner`}
        >
            <input ref={fileInputRef} id={id} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            {currentImage ? (
                <>
                    <img src={currentImage.data} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/70 flex flex-col gap-4 justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Trocar Imagem</button>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-400 p-4 flex flex-row items-center gap-4">
                    {icon}
                    <div>
                        <p className="font-semibold text-lg text-gray-300">{title}</p>
                        <p className="text-sm text-gray-500">Arraste e solte ou clique para enviar</p>
                    </div>
                </div>
            )}
        </label>
    );
});

const PresetOutfits = ({ outfits, onSelect, isLoading }: { outfits: PresetOutfit[], onSelect: (outfit: PresetOutfit) => void, isLoading: boolean }) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-center">Carregando Tendências 2025...</h2>
                <div className="flex justify-center p-10"><LoadingSpinnerIcon text="" /></div>
            </div>
        );
    }
    
    if (outfits.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Ou Inspire-se nas Tendências</h2>
            <div className="relative">
                <div className="flex space-x-6 overflow-x-auto pb-4 -mb-4 snap-x snap-mandatory">
                    {outfits.map(outfit => (
                        <div key={outfit.id} onClick={() => onSelect(outfit)} className="snap-center flex-shrink-0 w-64 h-80 rounded-xl overflow-hidden cursor-pointer group relative">
                            <img src={outfit.images[outfit.mainImageIndex].data} alt={outfit.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-4">
                                <h3 className="text-white text-lg font-semibold">{outfit.name}</h3>
                            </div>
                            {outfit.images.length > 1 &&
                                <div className="absolute top-2 right-2 bg-fuchsia-500/90 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    {outfit.images.length} ângulos
                                </div>
                            }
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ResultModal = ({ image, onClose, onSave }: { image: string, onClose: () => void, onSave: () => void }) => {
    const [isSharing, setIsSharing] = useState(false);
    const [shareError, setShareError] = useState('');

    const handleShare = async () => {
        setShareError('');
        if (!navigator.share) {
            setShareError("O compartilhamento não é suportado neste navegador.");
            return;
        }
        setIsSharing(true);
        try {
            const response = await fetch(image);
            const blob = await response.blob();
            const file = new File([blob], 'estilo-gerado.png', { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Estilo Virtual AI',
                    text: 'Confira o look que criei com o Estilista Virtual AI!',
                });
            } else {
                setShareError("Não é possível compartilhar este tipo de arquivo.");
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                // Do nothing
            } else {
                console.error("Erro ao compartilhar:", error);
                setShareError("Ocorreu um erro ao tentar compartilhar.");
            }
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="relative bg-gray-900 rounded-lg p-4 max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-4 -left-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white z-10" aria-label="Fechar"><ArrowLeftIcon /></button>
                <img src={image} alt="Estilo Gerado" className="w-full h-auto object-contain max-h-[calc(90vh-120px)] rounded" />
                <div className="mt-4 space-y-2">
                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <a href={image} download="estilo-gerado.png" className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"><DownloadIcon /> Baixar</a>
                        {navigator.share && (
                            <button onClick={handleShare} disabled={isSharing} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50">
                                {isSharing ? <LoadingSpinnerIcon /> : <ShareIcon />} Compartilhar
                            </button>
                        )}
                        <button onClick={onSave} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"><PlusIcon /> Salvar no Lookbook</button>
                    </div>
                    {shareError && <p className="text-red-400 text-sm text-right mt-2">{shareError}</p>}
                </div>
            </div>
        </div>
    );
};

const MyStyleLookbook = ({ images, setImages }: { images: string[], setImages: (images: string[]) => void }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleRemove = (indexToRemove: number) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
        if (activeIndex >= images.length - 1) {
            setActiveIndex(Math.max(0, images.length - 2));
        }
    };
    if (images.length === 0) return null;
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-center">Meu Lookbook de Estilos</h2>
            <div className="relative bg-gray-800 rounded-lg p-4">
                <div className="relative w-full aspect-[4/5] overflow-hidden rounded-md group">
                    <img src={images[activeIndex]} alt={`Item do Lookbook ${activeIndex + 1}`} className="w-full h-full object-contain animate-fade-in" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                         <a href={images[activeIndex]} download={`style-${activeIndex}.png`} className="p-2 bg-fuchsia-600/80 hover:bg-fuchsia-500 rounded-full text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg></a>
                         <button onClick={() => handleRemove(activeIndex)} className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white"><TrashIcon /></button>
                    </div>
                </div>
            </div>
            <div className="flex justify-center">
                <div className="flex space-x-3 overflow-x-auto p-2">
                    {images.map((img, index) => (
                        <img key={index} src={img} onClick={() => setActiveIndex(index)} className={`w-20 h-24 object-cover rounded-md cursor-pointer border-4 transition-all ${activeIndex === index ? 'border-fuchsia-500' : 'border-transparent hover:border-fuchsia-500/50'}`} alt={`Miniatura ${index + 1}`} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const OutfitDetailModal = ({ trend, onClose, onSelect }: { trend: PresetOutfit, onClose: () => void, onSelect: (image: OutfitImage) => void }) => {
    const [selectedAngle, setSelectedAngle] = useState(trend.images[trend.mainImageIndex].angle);
    const [selectedVariation, setSelectedVariation] = useState(trend.images[trend.mainImageIndex]);

    const angles = useMemo(() => [...new Set(trend.images.map(img => img.angle).filter(Boolean))], [trend.images]);
    const variationsForAngle = useMemo(() => trend.images.filter(img => img.angle === selectedAngle), [trend.images, selectedAngle]);
    
    useEffect(() => {
        if (variationsForAngle.length > 0) {
            setSelectedVariation(variationsForAngle[0]);
        }
    }, [selectedAngle, variationsForAngle]);

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="relative bg-gray-800 rounded-xl p-8 max-w-4xl w-full" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-fuchsia-400">Personalize Seu Look</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-700 rounded-lg flex items-center justify-center p-4">
                        <img src={selectedVariation.data} alt={`${selectedVariation.angle} - ${selectedVariation.variationName}`} className="max-h-96 object-contain rounded" />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">1. Escolha o Ângulo</h3>
                            <div className="flex flex-wrap gap-2">
                                {angles.map(angle => (
                                    <button key={angle} onClick={() => setSelectedAngle(angle)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border-2 ${selectedAngle === angle ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'bg-gray-700 border-gray-600 hover:border-fuchsia-500'}`}>
                                        {angle}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">2. Selecione a Variação</h3>
                            <div className="flex flex-wrap gap-3">
                                {variationsForAngle.map(variation => (
                                    <button key={variation.id} onClick={() => setSelectedVariation(variation)} className={`relative h-12 w-12 rounded-full border-4 transition-all flex items-center justify-center ${selectedVariation.id === variation.id ? 'border-fuchsia-500' : 'border-gray-600 hover:border-gray-500'}`} title={variation.variationName}>
                                        <div className="h-10 w-10 rounded-full" style={{ background: variation.swatch }}></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => onSelect(selectedVariation)} className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center">
                            Usar Este Look
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ADMIN VIEW & COMPONENTS ---
// These components would be in a separate file in a larger app.
const AdminView = ({ initialPresets, onUpdatePresets }: { initialPresets: PresetOutfit[], onUpdatePresets: (presets: PresetOutfit[]) => void }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [editingTrendId, setEditingTrendId] = useState<string | null>(null);

    const handleAdd = async (newOutfit: Omit<PresetOutfit, 'id'>) => {
        try {
            await addPresetOutfit(newOutfit);
            const updated = await getPresetOutfits();
            onUpdatePresets(updated);
            setIsCreating(false);
        } catch (error) {
            console.error("Failed to add trend:", error);
            // Here you would show a toast or error message to the admin
        }
    };

    const handleRemove = async (outfit: PresetOutfit) => {
        if (window.confirm("Tem certeza que deseja deletar esta tendência?")) {
            try {
                await removePresetOutfit(outfit);
                const updated = await getPresetOutfits();
                onUpdatePresets(updated);
            } catch (error) {
                console.error("Failed to remove trend:", error);
            }
        }
    };

    const handleNameUpdate = async (outfitId: string, newName: string) => {
        const outfitToUpdate = initialPresets.find(p => p.id === outfitId);
        if (outfitToUpdate && newName.trim() && outfitToUpdate.name !== newName) {
            try {
                await updatePresetOutfit({ ...outfitToUpdate, name: newName.trim() });
                const updated = await getPresetOutfits();
                onUpdatePresets(updated);
            } catch(error) {
                 console.error("Failed to update trend name:", error);
            }
        }
        setEditingTrendId(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-fuchsia-400">Painel do Admin: Gerenciar Tendências</h2>
                <button onClick={() => setIsCreating(true)} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"><PlusIcon /> Nova Tendência</button>
            </div>
            
            {isCreating && <NewTrendCreator onAddTrend={handleAdd} onCancel={() => setIsCreating(false)} />}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {initialPresets.map(outfit => (
                    <div key={outfit.id} className="bg-gray-800 rounded-lg overflow-hidden group relative">
                        <img src={outfit.images[outfit.mainImageIndex].data} alt={outfit.name} className="w-full h-64 object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editingTrendId === outfit.id ? (
                                <input
                                    type="text"
                                    defaultValue={outfit.name}
                                    className="w-full bg-gray-900/80 text-white text-lg font-semibold p-1 rounded border border-fuchsia-500"
                                    autoFocus
                                    onBlur={(e) => handleNameUpdate(outfit.id, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleNameUpdate(outfit.id, e.currentTarget.value);
                                        if (e.key === 'Escape') setEditingTrendId(null);
                                    }}
                                />
                            ) : (
                                <h3 className="text-lg font-semibold text-white">{outfit.name}</h3>
                            )}
                        </div>
                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingTrendId(outfit.id)} className="p-2 bg-blue-600/80 hover:bg-blue-500 rounded-full text-white" aria-label="Editar nome da tendência"><EditIcon /></button>
                            <button onClick={() => handleRemove(outfit)} className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white" aria-label="Deletar tendência"><TrashIcon /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NewTrendCreator = ({ onAddTrend, onCancel }: { onAddTrend: (newOutfit: Omit<PresetOutfit, 'id'>) => void, onCancel: () => void }) => {
    // This is a complex component, simplified for brevity.
    // In a real app, it would handle file uploads, name suggestions, etc.
    const [images, setImages] = useState<OutfitImage[]>([]);
    const [mainImageIndex, setMainImageIndex] = useState(0);
    const [trendName, setTrendName] = useState("");
    const [nameSuggestion, setNameSuggestion] = useState("");
    const [isSuggesting, setIsSuggesting] = useState(false);

    const handleAddImages = (newImages: Omit<OutfitImage, 'id'>[]) => {
        const fullImages = newImages.map(img => ({...img, id: `new-${Date.now()}-${Math.random()}`}))
        setImages(prev => [...prev, ...fullImages]);
    };
    
    const handleSuggestName = async () => {
        if (images.length === 0) return;
        setIsSuggesting(true);
        try {
            const name = await generateTrendName(images[mainImageIndex]);
            setNameSuggestion(name);
        } catch (error) {
            console.error("Falha ao sugerir nome", error);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSaveTrend = () => {
        if (!trendName || images.length === 0) {
            alert("Por favor, forneça um nome e pelo menos uma imagem.");
            return;
        }
        onAddTrend({
            name: trendName,
            images,
            mainImageIndex,
        });
    };

    return (
      <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50" onClick={onCancel}>
          <div className="bg-gray-800 rounded-xl p-8 max-w-4xl w-full space-y-6" onClick={e => e.stopPropagation()}>
               <h2 className="text-2xl font-bold text-fuchsia-400">Criar Nova Tendência</h2>
               <MultiDropZone onImagesSelect={handleAddImages} />
               {images.length > 0 && (
                   <div className="space-y-4">
                       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                           {images.map((img, index) => (
                               <div key={img.id} className="relative group" onClick={() => setMainImageIndex(index)}>
                                   <img src={img.data} alt={`upload ${index}`} className={`w-full aspect-square object-cover rounded-md cursor-pointer border-4 ${mainImageIndex === index ? 'border-fuchsia-500' : 'border-transparent'}`} />
                                   {mainImageIndex === index && <div className="absolute top-1 right-1"><CheckCircleIcon /></div>}
                               </div>
                           ))}
                       </div>
                       <div className="flex gap-4 items-end">
                            <div className="flex-grow">
                                <label htmlFor="trendName" className="block text-sm font-medium mb-1">Nome da Tendência</label>
                                <input id="trendName" type="text" value={trendName} onChange={e => setTrendName(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2" />
                                {nameSuggestion && <p className="text-xs mt-1 text-gray-400">Sugestão: <button onClick={() => setTrendName(nameSuggestion)} className="font-semibold text-fuchsia-400 hover:underline">{nameSuggestion}</button></p>}
                            </div>
                            <button onClick={handleSuggestName} disabled={isSuggesting} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center self-end">
                               {isSuggesting ? <LoadingSpinnerIcon /> : 'Sugerir Nome'}
                            </button>
                       </div>
                   </div>
               )}
               <div className="flex justify-end gap-4">
                   <button onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                   <button onClick={handleSaveTrend} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold py-2 px-4 rounded-lg">Salvar Tendência</button>
               </div>
          </div>
      </div>
    );
};

const MultiDropZone = ({ onImagesSelect }: { onImagesSelect: (images: Omit<OutfitImage, 'id'>[]) => void }) => {
    const [isDragging, setIsDragging] = useState(false);
    
    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const imagePromises = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .map(async (file) => {
                const data = await fileToBase64(file);
                return { data, mimeType: file.type };
            });
        
        const newImages = await Promise.all(imagePromises);
        onImagesSelect(newImages);
    };

    const onDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(false); };
    const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); };
    const onDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
    };
    
    return (
        <label
            htmlFor="multi-upload"
            onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
            className={`p-6 border-2 border-dashed rounded-xl flex flex-col justify-center items-center h-40 cursor-pointer transition-colors
            ${isDragging ? 'border-fuchsia-500 bg-fuchsia-900/20' : 'border-gray-600 hover:border-fuchsia-500'}`}
        >
            <input id="multi-upload" type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
            <div className="text-center text-gray-400">
                <UploadIcon />
                <p className="mt-2 font-semibold text-lg">Enviar Imagens da Tendência</p>
                <p>Solte vários arquivos ou clique para selecionar</p>
            </div>
        </label>
    );
};


export default App;
