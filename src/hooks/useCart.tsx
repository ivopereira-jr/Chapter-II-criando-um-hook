import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function stockOfProduct(id: number) {
    const stock = await api.get<Stock>(`stock/${id}`)
    .then(response => response.data)

    return stock
  }

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId) 
      
      if(productInCart) {
        const stock = await stockOfProduct(productId)

        const updateAmountProduct = cart.map(product => product.id === productId 
          ? {...product, amount: productInCart.amount + 1 } : product) 

        if(productInCart.amount + 1 > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque')
          
          return
        }

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateAmountProduct))

        setCart(updateAmountProduct)
        
        return
      } else {
        const stock = await stockOfProduct(productId)
        const { data: product } = await api.get(`products/${productId}`)

        const newCart = [...cart, { ...product, amount: 1 }] 
        const findNewCart: Product = newCart.find(product => product.id === productId)
        
        if(findNewCart.amount > stock.amount && findNewCart.amount < 1) {
          
          toast.error('Quantidade solicitada fora de estoque')
          
          return
        }
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        
        setCart(newCart)
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(product => product.id === productId)

      if(!findProduct) {
        toast.error('Erro na remoção do produto')

        return
      }

      const filterProducts = cart.filter(product => product.id !== productId) 

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filterProducts))

      setCart(filterProducts)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {     
      if(amount < 1) return

      const { data: stock } = await api.get<Stock>(`stock/${productId}`)
      
      if(amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')

        return
      }

      const findProduct = cart.find(product => product.id === productId)

      if(!findProduct) {
        toast.error('Erro na alteração de quantidade do produto')

        return
      }

      const updateProductAmountInCart  = cart.map(product => product.id === productId 
        ? {...product, amount: amount } : product) 
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProductAmountInCart))

      setCart(updateProductAmountInCart)
    } catch {
      return toast.error('Erro na alteração de quantidade do produto');
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
