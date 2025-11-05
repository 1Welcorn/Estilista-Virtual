

import React, { useState, useRef, useEffect } from 'react';
import { styleModelWithOutfit, generateTrendName, suggestBackgrounds } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// Add global type definitions for the aistudio object to ensure type safety.
// FIX: The TypeScript compiler reported a conflict with an existing global declaration for `window.aistudio`.
// To resolve this, a named interface `AIStudio` is defined and used, as suggested by the error message
// which expects `aistudio` to be of type `AIStudio`.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio: AIStudio;
  }
}


// SVG Icon Components
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const KeyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L4.257 19.743A1 1 0 012.843 18.33l6-6A6 6 0 1118 8zm-6-3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
);

// Define background options with display names and prompt values for the AI
const backgroundOptions = [
    { name: 'Estúdio Neutro', value: 'Use um fundo de estúdio neutro.' },
    { name: 'Cidade à Noite', value: 'Em uma cidade à noite com luzes de neon.' },
    { name: 'Praia Tropical', value: 'Em uma praia tropical ensolarada com águas cristalinas.' },
    { name: 'Jardim Botânico', value: 'Em um jardim botânico exuberante com flores vibrantes.' },
    { name: 'Arquitetura', value: 'Com um fundo de arquitetura moderna e minimalista.' },
];

// Helper to format suggestion strings for button labels
const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const CameraModal: React.FC<{ isOpen: boolean; onClose: () => void; onCapture: (file: File) => void; }> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Erro ao acessar a câmera: ", err);
                alert("Não foi possível acessar a câmera. Verifique as permissões no seu navegador.");
                onClose();
            }
        };

        const stopCamera = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };

        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, onClose]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    const photoFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onCapture(photoFile);
                }
            }, 'image/jpeg');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-800 p-4 rounded-lg max-w-3xl w-full border border-gray-700 shadow-2xl">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-md aspect-video object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="mt-4 flex justify-center gap-4">
                    <button onClick={handleCapture} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
                        Capturar
                    </button>
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ApiKeySelectionScreen: React.FC<{ onSelectKey: () => void; error?: string | null }> = ({ onSelectKey, error }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-2xl text-center max-w-md w-full">
            <h1 className="text-3xl font-bold text-white mb-4">Bem-vindo ao Estilista Virtual AI</h1>
            <p className="text-gray-400 mb-6">Para usar este aplicativo, você precisa selecionar uma chave de API do Google AI Studio. Isso permite que o aplicativo se comunique com os modelos de IA da Gemini.</p>
            {error && <p className="text-red-400 text-center bg-red-900/20 p-3 rounded-md animate-fade-in mb-4">{error}</p>}
            <button
                onClick={onSelectKey}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg shadow-lg"
            >
                Selecionar Chave de API
            </button>
            <p className="text-xs text-gray-500 mt-4">
                O uso da API Gemini pode incorrer em custos. Por favor, revise a{' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-400">
                    documentação de faturamento
                </a> para mais detalhes.
            </p>
        </div>
    </div>
);


const App: React.FC = () => {
  const [modelImage, setModelImage] = useState<{ file: File, preview: string } | null>(null);
  const [outfitImage, setOutfitImage] = useState<{ file: File, preview: string } | null>(null);
  const [prompt, setPrompt] = useState<string>(backgroundOptions[0].value);
  const [accessories, setAccessories] = useState({
    footwear: false,
    bag: false,
    fit: false,
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [trendName, setTrendName] = useState<string>('');
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<{ open: boolean; target: 'model' | 'outfit' | null }>({ open: false, target: null });
  
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const checkAndSetApiKey = async () => {
    setIsCheckingApiKey(true);
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setIsApiKeySelected(hasKey);
      if (hasKey) {
        setApiKeyError(null);
      }
    } catch (e) {
      console.error("Erro ao verificar a chave de API:", e);
      setIsApiKeySelected(false);
      setApiKeyError("Ocorreu um erro ao verificar sua chave de API. Por favor, recarregue.");
    } finally {
      setIsCheckingApiKey(false);
    }
  };

  useEffect(() => {
    // Poll for the aistudio object to ensure it's loaded before we use it.
    const intervalId = setInterval(() => {
      if (window.aistudio) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        checkAndSetApiKey();
      }
    }, 100);

    // If the aistudio object doesn't load after 5 seconds, show an error.
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setIsCheckingApiKey(false);
      setApiKeyError("Não foi possível inicializar o seletor de chave de API. Por favor, recarregue a página e tente novamente.");
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);
  
  const handleSelectKey = async () => {
    setApiKeyError(null);
    try {
      await window.aistudio.openSelectKey();
      // After the dialog closes, we must re-check the key status
      await checkAndSetApiKey();
    } catch (e) {
      console.error("Não foi possível abrir o seletor de chave de API:", e);
      setApiKeyError("Não foi possível abrir o seletor de chaves. Verifique sua conexão e tente novamente.");
    }
  };


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, setImage: React.Dispatch<React.SetStateAction<{ file: File; preview: string; } | null>>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      setImage({ file, preview });

      if (setImage === setModelImage && modelImage) URL.revokeObjectURL(modelImage.preview);
      if (setImage === setOutfitImage && outfitImage) URL.revokeObjectURL(outfitImage.preview);
      
      if (setImage === setOutfitImage) {
        handleOutfitAnalysis(file);
      }
    }
  };
  
  const handlePhotoCapture = (photoFile: File) => {
    const { target } = cameraState;
    if (!target) return;

    const preview = URL.createObjectURL(photoFile);
    const newImage = { file: photoFile, preview };

    if (target === 'model') {
        if (modelImage) URL.revokeObjectURL(modelImage.preview);
        setModelImage(newImage);
    } else {
        if (outfitImage) URL.revokeObjectURL(outfitImage.preview);
        setOutfitImage(newImage);
        handleOutfitAnalysis(photoFile);
    }
    
    setCameraState({ open: false, target: null });
  };


  const handleOutfitAnalysis = async (file: File) => {
    try {
      setError(null);
      const base64String = await fileToBase64(file);
      const outfitImageData = { data: base64String, mimeType: file.type };
      
      const namePromise = generateTrendName(outfitImageData);
      const backgroundsPromise = suggestBackgrounds(outfitImageData);

      const [name, bgSuggestions] = await Promise.all([namePromise, backgroundsPromise]);
      
      setTrendName(name);
      setBackgrounds(bgSuggestions);
    } catch (err) {
      console.error("Erro ao analisar a roupa:", err);
      let displayError = "Não foi possível analisar a imagem da roupa. Por favor, tente novamente.";
      if (err instanceof Error) {
          const errorMessage = err.message;
          if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("Requested entity was not found")) {
            displayError = "Sua chave de API não é válida. Por favor, selecione uma chave válida.";
            setApiKeyError(displayError);
            setIsApiKeySelected(false);
            return;
          } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
              displayError = "Você excedeu sua cota de uso da API. Verifique seu plano e faturamento ou tente novamente mais tarde.";
          }
      }
      setError(displayError);
    }
  };
  
  const handleAccessoryToggle = (accessory: keyof typeof accessories) => {
    setAccessories(prev => ({
        ...prev,
        [accessory]: !prev[accessory]
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelImage || !outfitImage) {
      setError("Por favor, carregue a imagem do modelo e da roupa.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const modelBase64 = await fileToBase64(modelImage.file);
      const outfitBase64 = await fileToBase64(outfitImage.file);

      const modelImageData = { data: modelBase64, mimeType: modelImage.file.type };
      const outfitImageData = { data: outfitBase64, mimeType: outfitImage.file.type };
      
      let finalPrompt = prompt;
      if (accessories.footwear) {
        finalPrompt += " Adicione um calçado da moda que combine perfeitamente com a roupa.";
      }
      if (accessories.bag) {
        finalPrompt += " Adicione uma bolsa da moda que combine perfeitamente com a roupa.";
      }
      if (accessories.fit) {
        finalPrompt += " Ajuste a modelagem e o tamanho da roupa para um caimento perfeito e realista no corpo do modelo.";
      }


      const result = await styleModelWithOutfit(modelImageData, outfitImageData, finalPrompt);
      setGeneratedImage(result);
    } catch (err) {
      console.error("Erro ao gerar a imagem:", err);
      let displayError = "Ocorreu um erro ao gerar a imagem. Por favor, tente novamente.";
      if (err instanceof Error) {
          const errorMessage = err.message;
          if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("Requested entity was not found")) {
            displayError = "Sua chave de API não é válida. Por favor, selecione uma chave válida.";
            setApiKeyError(displayError);
            setIsApiKeySelected(false);
          } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
              displayError = "Você excedeu sua cota de uso da API. Verifique seu plano e faturamento ou tente novamente mais tarde.";
          }
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };
  
  const ImageUploader = ({ title, image, onImageChange, id, onTakePhotoClick }: { title: string, image: { preview: string } | null, onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void, id: string, onTakePhotoClick: () => void }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-center text-gray-300">{title}</h2>
      <div className="flex-grow flex items-center justify-center">
        {image ? (
          <img src={image.preview} alt="Preview" className="w-full h-64 object-cover rounded-md" />
        ) : (
          <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-700/50 rounded-md border-2 border-dashed border-gray-600">
            <UploadIcon />
            <p className="mt-2 text-sm text-gray-400 text-center">Arraste e solte ou carregue uma imagem</p>
          </div>
        )}
      </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label htmlFor={id} className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-center flex items-center justify-center">
          Do Arquivo
        </label>
        <button type="button" onClick={onTakePhotoClick} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-center flex items-center justify-center">
          Da Câmera
        </button>
      </div>
      <input id={id} type="file" accept="image/*" className="hidden" onChange={onImageChange} />
    </div>
  );

  if (isCheckingApiKey) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-4">
            <SpinnerIcon />
            <p className="mt-2 text-lg">Verificando configuração...</p>
        </div>
    );
  }

  if (!isApiKeySelected) {
    return <ApiKeySelectionScreen onSelectKey={handleSelectKey} error={apiKeyError} />;
  }


  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10 relative">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">Estilista Virtual AI</h1>
        <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">Vista qualquer modelo com qualquer roupa e crie o cenário perfeito. A moda do futuro, hoje.</p>
        <div className="absolute top-0 right-0">
          <button 
            onClick={handleSelectKey}
            className="flex items-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm"
            aria-label="Mudar Chave de API"
          >
            <KeyIcon />
            Mudar Chave de API
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna de Controles */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <ImageUploader title="1. Escolha o Modelo" image={modelImage} onImageChange={(e) => handleImageChange(e, setModelImage)} id="model-upload" onTakePhotoClick={() => setCameraState({ open: true, target: 'model'})} />
                 <ImageUploader title="2. Escolha a Roupa" image={outfitImage} onImageChange={(e) => handleImageChange(e, setOutfitImage)} id="outfit-upload" onTakePhotoClick={() => setCameraState({ open: true, target: 'outfit'})} />
            </div>

            {trendName && (
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center animate-fade-in">
                    <p className="text-sm text-gray-400">Nome da Tendência Sugerido</p>
                    <p className="text-xl font-semibold text-indigo-400">{trendName}</p>
                </div>
            )}
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-300">3. Escolha o Cenário</h2>
                <div className="flex flex-wrap gap-3">
                    {backgroundOptions.map((option) => (
                        <button
                            key={option.name}
                            type="button"
                            onClick={() => setPrompt(option.value)}
                            className={`transition-colors duration-200 ease-in-out font-medium py-2 px-4 rounded-lg text-sm
                                ${prompt === option.value
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                }`
                            }
                        >
                            {option.name}
                        </button>
                    ))}
                </div>

                {backgrounds.length > 0 && (
                    <div className="animate-fade-in border-t border-gray-700 pt-4 mt-2">
                        <p className="text-sm font-medium text-gray-400 mb-3">Sugestões com base na roupa:</p>
                        <div className="flex flex-wrap gap-3">
                            {backgrounds.map((bg, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setPrompt(bg)}
                                    className={`transition-colors duration-200 ease-in-out font-medium py-2 px-4 rounded-lg text-sm text-left
                                        ${prompt === bg
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                        }`
                                    }
                                >
                                    {toTitleCase(bg)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-300">4. Acessórios e Ajustes</h2>
                <div className="space-y-3">
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={accessories.footwear} 
                            onChange={() => handleAccessoryToggle('footwear')} 
                            className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                        />
                        <span className="ml-3">Sugerir calçado</span>
                    </label>
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={accessories.bag} 
                            onChange={() => handleAccessoryToggle('bag')} 
                            className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                        />
                        <span className="ml-3">Sugerir bolsa</span>
                    </label>
                    <label className="flex items-center text-gray-300 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={accessories.fit} 
                            onChange={() => handleAccessoryToggle('fit')} 
                            className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                        />
                        <span className="ml-3">Ajuste de modelagem</span>
                    </label>
                </div>
            </div>


            <button type="submit" disabled={isLoading || !modelImage || !outfitImage} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-colors flex items-center justify-center text-lg shadow-lg">
                {isLoading ? <><SpinnerIcon /> Gerando...</> : 'Vestir Modelo'}
            </button>
             {error && <p className="text-red-400 text-center bg-red-900/20 p-3 rounded-md animate-fade-in">Erro: {error}</p>}
        </form>

        {/* Coluna de Resultado */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center min-h-[500px] lg:min-h-full">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Resultado</h2>
            <div className="w-full flex-grow flex items-center justify-center">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center text-gray-400 animate-fade-in">
                        <SpinnerIcon />
                        <p className="mt-2">A IA está criando sua imagem...</p>
                    </div>
                )}
                {!isLoading && error && (
                     <div className="text-center text-red-400 animate-fade-in p-4">
                        <p>Ocorreu um erro ao gerar a imagem.</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                )}
                {!isLoading && !error && generatedImage && (
                    <img src={generatedImage} alt="Modelo com nova roupa" className="w-full max-w-md h-auto object-contain rounded-md animate-fade-in shadow-2xl" />
                )}
                {!isLoading && !error && !generatedImage && (
                    <div className="text-center text-gray-500">
                        <ImageIcon />
                        <p className="mt-2">O resultado da sua criação aparecerá aqui.</p>
                    </div>
                )}
            </div>
        </div>
      </main>
      
      <CameraModal 
        isOpen={cameraState.open} 
        onClose={() => setCameraState({ open: false, target: null })}
        onCapture={handlePhotoCapture}
      />
    </div>
  );
};

export default App;