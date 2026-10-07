import React, { createContext, useContext, useState, useEffect } from 'react';
import GlobalSearchModal from '../components/GlobalSearchModal';
import Product360Modal from '../components/Product360Modal';

const InventoryUIContext = createContext(null);

export function InventoryUIProvider({ children }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [product360Data, setProduct360Data] = useState(null);

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  const openProduct360 = (prodOrId) => {
    if (typeof prodOrId === 'object' && prodOrId !== null) {
      setProduct360Data({ product: prodOrId, productId: prodOrId.id });
    } else {
      setProduct360Data({ product: null, productId: prodOrId });
    }
  };

  const closeProduct360 = () => {
    setProduct360Data(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <InventoryUIContext.Provider
      value={{
        isSearchOpen,
        openSearch,
        closeSearch,
        openProduct360,
        closeProduct360,
      }}
    >
      {children}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={closeSearch}
        onOpenProduct360={(prod) => {
          closeSearch();
          openProduct360(prod);
        }}
      />
      {product360Data && (
        <Product360Modal
          isOpen={true}
          product={product360Data.product}
          productId={product360Data.productId}
          onClose={closeProduct360}
        />
      )}
    </InventoryUIContext.Provider>
  );
}

export function useInventoryUI() {
  const context = useContext(InventoryUIContext);
  if (!context) {
    throw new Error('useInventoryUI must be used within an InventoryUIProvider');
  }
  return context;
}
