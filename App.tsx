// FIX: Replaced placeholder content with a functional React component to fix module and syntax errors.
import React, { useState } from 'react';
import { styleModelWithOutfit, generateTrendName, suggestBackgrounds } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

const App: React.FC = () => {
  const [modelImage, setModelImage] = useState<{ file: File, preview: string } | null>(null);
  const [outfitImage, setOutfitImage] = useState<{ file: File, preview: string } | null>(null);
  const [prompt, setPrompt] = useState<string>('Use um fundo de estúdio neutro.');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [trendName, setTrendName] = useState<string>('');
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, setImage: React.Dispatch<React.SetStateAction<{ file: File; preview: string; } | null>>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage({
        file,
        preview: URL.createObjectURL(file)
      });
      if (setImage === setOutfitImage) {
        handleOutfitAnalysis(file);
      }
    }
  };

  const handleOutfitAnalysis = async (file: File) => {
    try {
      const base64String = await fileToBase64(file);
      const outfitImageData = { data: base64String, mimeType: file.type };
      
      const namePromise = generateTrendName(outfitImageData);
      const backgroundsPromise = suggestBackgrounds(outfitImageData);

      const [name, bgSuggestions] = await Promise.all([namePromise, backgroundsPromise]);
      
      setTrendName(name);
      setBackgrounds(bgSuggestions);
      if (bgSuggestions.length > 0 && prompt === 'Use um fundo de estúdio neutro.') {
        setPrompt(bgSuggestions[0]);
      }
    } catch (err) {
      console.error("Erro ao analisar a roupa:", err);
      setError("Não foi possível analisar a imagem da roupa. Por favor, tente novamente.");
    }
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

      const result = await styleModelWithOutfit(modelImageData, outfitImageData, prompt);
      setGeneratedImage(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <h1>Provador Virtual com IA</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <h2>1. Escolha o Modelo</h2>
            <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setModelImage)} required />
            {modelImage && <img src={modelImage.preview} alt="Modelo" style={{ width: '100%', marginTop: '10px' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <h2>2. Escolha a Roupa</h2>
            <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setOutfitImage)} required />
            {outfitImage && <img src={outfitImage.preview} alt="Roupa" style={{ width: '100%', marginTop: '10px' }} />}
          </div>
        </div>
        
        {trendName && <p>Nome da tendência: <strong>{trendName}</strong></p>}

        <h2>3. Descreva o Cenário</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          style={{ width: '100%', marginBottom: '10px' }}
          placeholder="Ex: Fundo de estúdio, praia ensolarada, cidade à noite..."
        />
        {backgrounds.length > 0 && (
          <div>
            <p>Sugestões de fundo:</p>
            {backgrounds.map((bg, index) => (
              <button key={index} type="button" onClick={() => setPrompt(bg)} style={{marginRight: '5px', marginBottom: '5px'}}>
                {bg}
              </button>
            ))}
          </div>
        )}

        <button type="submit" disabled={isLoading || !modelImage || !outfitImage} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
          {isLoading ? 'Gerando...' : 'Vestir Modelo'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>Erro: {error}</p>}

      {generatedImage && (
        <div style={{ marginTop: '30px' }}>
          <h2>Resultado</h2>
          <img src={generatedImage} alt="Modelo com nova roupa" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
};

export default App;
