import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { ProductManagementException, Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function hasItemOnStock(productId: number): Promise<boolean> {
    const productStock = await api.get<UpdateProductAmount>(`stock/${productId}`).then(response => response.data.amount)

    return productStock > 0;
  }

  function retrieveProductIndex(productId: number) {
    const productFound = cart.find((product: Product) => {return product.id === productId});

    if (productFound) {
      return cart.indexOf(productFound)
    };

    return -1;
  }

  function updateLocalStorage(cart: Product[]){
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }

  const addProduct = async (productId: number) => {
    try {
      if (!await hasItemOnStock(productId)) {
        toast.error('This product is out of stock!');
        return;
      }

      const productIndexOnCart = retrieveProductIndex(productId);

      const addingProduct = await api.get<Product>(`products/${productId}`).then(response => response.data )
      
      if (productIndexOnCart === -1) {
                
        const amount = 1;
     
        setCart([...cart, {...addingProduct, amount}]);

        updateLocalStorage([...cart, {...addingProduct, amount}])
      } else {


        updateProductAmount({ productId, amount: cart[productIndexOnCart].amount + 1 });
      }        
          
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  async function retrieveProductStock(productId: number): Promise<Stock> {
    const productStock = await api.get<Stock>(`stock/${productId}`).then(product => product.data)

    return productStock;    
  }
      
  const removeProduct = async (productId: number) => {
    try {
      
      const productIndexOnCart = retrieveProductIndex(productId);
      
      if (productIndexOnCart === -1) {
        throw new Error();
      }

      const updatingCart = [...cart];
      updatingCart.splice(productIndexOnCart)

      setCart([...updatingCart])
      updateLocalStorage(updatingCart)

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new ProductManagementException("It must have at least 1 item.");
      }
      
      const productStock = await retrieveProductStock(productId);
      
      if (!productStock) {
        throw new ProductManagementException();
      }
      
      if (productStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      const updatedCart = [...cart]
      
      updatedCart[retrieveProductIndex(productId)].amount = amount;

      setCart([...updatedCart])
      updateLocalStorage(updatedCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
