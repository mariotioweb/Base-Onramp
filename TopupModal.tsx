/* eslint-disable @next/next/no-img-element */
import { sendTransactionNotification } from '@/actions/notification';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTokenAmount, placeBid, placeBidBeforeMint } from '@/lib/helper';
import { getSeconds } from '@/lib/utils';
import { CreateNftServices } from '@/services/legacy/createNftService';
import { CreateSellService } from '@/services/legacy/createSellService';
import { INFTVoucher } from '@/types';
import { roundToDecimals, trimString } from '@/utils/helpers';
import { Country } from 'country-state-city';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { Address } from 'thirdweb';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { useDebounce } from 'use-debounce';
import { z } from 'zod';
import ConnectedCard from '../../Cards/ConnectedCard';
import { NFTPriceCard } from '../../Cards/NFTPriceCard';
import { useCreateNFT } from '../../Context/CreateNFTContext';
import { useGlobalContext } from '../../Context/GlobalContext';
import { useNFTDetail } from '../../Context/NFTDetailContext';
import BaseButton from '../../ui/BaseButton';
import ErrorModal from '../create/ErrorModal';

import Image from 'next/image';
import { ModalTitle } from '../../ui/thirdweb/modalElements';
import { Container } from '../../ui/thirdweb/basic';

import { fundingMethodState } from '@/hooks/recoil-state';
import { client } from '@/lib/client';
import { chain, isDev } from '@/lib/contract';
import { cn } from '@/lib/utils';
import { FundingType } from '@/types';
import { useRecoilState } from 'recoil';
import { NATIVE_TOKEN_ADDRESS } from 'thirdweb';
import {
  useBuyWithFiatQuote,
} from 'thirdweb/react';
import { FetchingPrice } from './funding-card/FetchingPrice';




import { generateOnrampURL } from "@/app/components/utilsOnramp/rampUtils";
import { ConnectButton } from "thirdweb/react";
import { getOnrampBuyUrl,fetchOnrampQuote } from '@coinbase/onchainkit/fund';

import { ethers } from 'ethers';


export default function TopupModal({
  title,
  fiatPrice,
  handleCancel,
  handleSuccess,
  onClose,
  tokenAmount,
  expectedAmount,
  balance,
  setStep
}: {
  title: string;
  fiatPrice: number | null;
  handleCancel: () => void;
  handleSuccess: () => void;
  onClose: () => void;
  tokenAmount: string | null;
  expectedAmount: number | null;
  balance: number;
  setStep: (val: number) => void;
}) {
  const [value, setValue] = useState<number>(0);
  const { fee, user } = useGlobalContext();
  const { NFTDetail:data,mainImage } = useNFTDetail();
  //const [tokenAmount, setTokenAmount] = useState<string | null>(null);
  //const [expectedAmount, setExpectedAmount] = useState<number | null>(null);
  const activeAccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [error, setError] = useState<string>('');
  const [quote, setQuote] = useState<string>('');
  const [quoteC, setQuoteC] = useState<string>('');
  const [errorActive, setErrorActive] = useState(false);
  
  const [newBalance, setBalance] = useState<number>(balance);
  
  const [pageIsReady, setPageIsReady] = useState(false);

  const {
    sellerInfo: { shipping, shippingId, contact, contactId },
  } = useCreateNFT();

const nftImage = mainImage ?? data.cloudinaryUrl;

  const address = useMemo(() => {
    if (activeAccount?.address)
      return (
        activeAccount?.address.slice(0, 6) +
        '...' +
        activeAccount?.address.slice(-4)
      );
    return 'Connect Wallet';
  }, [activeAccount]);

    const fetchBalance = async () => {
      // if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
          const provider =  new ethers.JsonRpcProvider(rpc);
          // Get the balance
          const balance1 = await provider.getBalance(activeAccount?.address);
          const balanceInEth = ethers.formatUnits(await balance1.toString() , 'ether') || 0;
          console.log('refreshed balance',balanceInEth)
          setBalance(Number(balanceInEth));
        } catch (err:any) {
          console.error(err.message);
        }
    /** } else {
        setError('MetaMask is not installed');
      } */ 
    };

    function scrollTo(){
      window.scrollTo(0, 0); 
    }
    
    useEffect(() => {
      console.log('SCROLL')

      setTimeout(() => {
        setPageIsReady(true)
      }, 500);
      scrollTo();
    }, []);


  const countries = Country.getAllCountries();
  const saleService = new CreateSellService();

  const cancelChanges = () => {
    handleCancel()
  };


  const [popup, setPopup] = useState<Window | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);


  interface FundingCardItemProps {
    fundingType: FundingType;
    tokenAmount: string;
    className?: string;
    
  }

  interface ThirdwebCardItemProps {
    tokenAmount: string;
  }
  
  interface CoinbaseCardItemProps {
    tokenAmount: string;
  }
  
  interface ErrorModalProps {
    title: string;
  }

  const FundingCardItem: React.FC<FundingCardItemProps> = ({
    fundingType,
    tokenAmount,
    className,
  }: FundingCardItemProps) => {
    const activeChain = useActiveWalletChain();
    const [option, setOption] = useRecoilState(fundingMethodState);
    const [usdAmount, setUsdAmount] = useState<number>(1);
  
    console.log('FundingCardItem', fundingType,tokenAmount);
    return (
      <div
        className={cn(
          'lg:w-full h-[219px] px-10 py-[30px] bg-[#111111] rounded-[15px] border-2 flex justify-start items-start gap-[30px] my-6 flex-col',
          option === fundingType ? 'border-yellow-400' : 'border-[#3a3a3a]',
          className,
        )}
        onClick={() => {
          setOption(fundingType);
        }}
        id="top"
      >
        <div className="flex justify-between w-full">
          <p className="font-extrabold text-2xl text-white">{fundingType}</p>
          <div className="flex gap-2 items-center">
            <Image
              src="/icons/formkit-info.svg"
              alt="info"
              width={18}
              height={18}
            />
            <p className="text-yellow-400 text-base">Details</p>
          </div>
        </div>
        <div className="flex justify-between w-full">

        <div className="items-start">
          <p className="text-3xl font-extrabold text-white">
            {`${Number(tokenAmount).toFixed(5)} ${activeChain?.nativeCurrency?.symbol}`}
          </p>

        </div>
        <div className={`py-3 w-[48%] min-h-[98px] rounded-lg text-black bg-neon font-extrabold text-sm`}>
        {fundingType === 'Coinbase' ? (
                 <button className="w-full h-full" onClick={()=>handleOnramp()}>
                  TopUp with Coinbase
                </button>
        ) : null}
        {fundingType === 'Thirdweb' ? (
              <div className={`relative max-h-[98px] my-3 rounded-lg text-black bg-neon font-extrabold text-sm w-full`}
              style={{position:'relative',display:'inline-block'}}
              onClick={()=>checkBalance()}>
                <span className="w-full text-center z-0 pointer-events-none" style={{position:'absolute',top:'50%',left: '50%',transform: 'translate(-50%, -50%)'}}>
                  TopUp with Thirdweb
                </span>
                <div className="opacity-0 w-full mx-auto flex justify-center z-10">
                <ConnectButton
                  client={client}
                  appMetadata={{
                    name: "Vault-X",
                    url: "https://vaultx.io/",
                  }}
                />
                </div>
              </div>
        ) : null}
        </div>
        </div>
      </div>
    );
  };
   
async function getCQuote() {
    const amount = tokenAmount;
    const fiatQuoteQuery:any =  fetchOnrampQuote({
      purchaseCurrency: 'ETH',
      purchaseNetwork: 'base',
      paymentCurrency: 'USD',
      paymentMethod: 'CARD',
      paymentAmount: fiatPrice.toString(),
      country: 'IT',
    // subdivision: 'CA', // Required for US residents
      apiKey: 'q5YPkqXTTMmP1F4QXuTg966HBi30k513', // Required when using without OnchainKitProvider or in non-React environment
    });
    console.log('ETH QUOTE COINBASE',JSON.stringify(fiatQuoteQuery),);
    console.log('ETH QUOTE COINBASE2',fiatQuoteQuery?.purchaseAmount?.value);

    return fiatQuoteQuery;
  }


//AFTER_RIO
const CoinbaseFundingItem: React.FC<CoinbaseCardItemProps> = async({
  tokenAmount
}: CoinbaseCardItemProps) => {
return;
const fiatQuoteQuery:any = await getCQuote()
     //ETH QUOTE COINBASE {"paymentTotal":{"value":"20","currency":"USD"},"paymentSubtotal":{"value":"19.51","currency":"USD"},"purchaseAmount":{"value":"0.01152841","currency":"ETH"},"coinbaseFee":{"value":"0.49","currency":"USD"},"networkFee":{"value":"0","currency":"USD"},"quoteId":"2e82a9c0-4815-4cbb-b196-f7154a470bf4"}

console.log('ETH QUOTE COINBASE',fiatQuoteQuery?.paymentSubtotal.value,JSON.stringify(fiatQuoteQuery),);
const TOT:number = Number(fiatQuoteQuery.paymentSubtotal?.value) + Number(fiatQuoteQuery?.coinbaseFee.value)
setQuoteC(fiatQuoteQuery.purchaseAmount?.value);
return;
  return (
    <p className="text-2xl text-[#8B8B8B]">
      {fiatQuoteQuery.purchaseAmount
        ? `= $${fiatQuoteQuery?.purchaseAmount.value} USD`
        : '= loading......'}
    </p>
  );
};


const ThirdwebFundingItem: React.FC<ThirdwebCardItemProps> = ({
  tokenAmount,
}: ThirdwebCardItemProps) => {
  const activeAccount = useActiveAccount();
  const fiatQuoteQuery = useBuyWithFiatQuote({
    fromCurrencySymbol: 'USD',
    toChainId: 1, // chain.id, testnet not returning correct quote
    toAddress: activeAccount?.address,
    toTokenAddress: NATIVE_TOKEN_ADDRESS,
    toAmount: tokenAmount,
    client: client,
    isTestMode: isDev,
    fromAddress: activeAccount?.address,
  });
  setQuote(fiatQuoteQuery.data?.fromCurrencyWithFees.amount);
  return (
    <p className="text-2xl text-[#8B8B8B]">
      {fiatQuoteQuery.data
        ? `= $${fiatQuoteQuery?.data?.fromCurrencyWithFees.amount} USD`
        : '= loading...'}

    </p>
  );
};



  const handleOnramp = () => {
    console.log("Onramp");
    if (!activeAccount.address) {
      alert("Please connect your wallet first");
      return;
    }
    const amount = tokenAmount;
    const selectedNetwork = "base";
    const redirectUrl = "https://testnet.vault-x.io/dashboard/curation";
    const redirectUrl2 = process.env.NEXT_PUBLIC_APP_BACKEND_URL + "/onramp";
    const enableGuestCheckout = true; // Add guest checkout option



 //https://docs.cdp.coinbase.com/onramp/docs/api-onramp-initializing

const projectId = 'aa65298a-d950-4827-b610-a85a707a4bd5';
const addresses = `{ "${activeAccount.address}" : ["base"] }`;

const onrampBuyUrl = `https://pay.coinbase.com/buy/select-asset?appId=${projectId}&addresses=${addresses}&assets=["ETH"]`
   console.log("Onramp URL:", onrampBuyUrl);

    const left = (window.screen.width / 2) - (500 / 2);
    const top = (window.screen.height / 2) - (700 / 2);
     const newPopup = window.open(
      onrampBuyUrl,
      'Coinbase Onramp Payment',
      `width=500,height=700,scrollbars=yes,left=${left},top=${top}`
    );
    setPopup(newPopup);
    if (!newPopup) {
      alert('Popup blocked! Please allow popups for this site.');
    }else{
      setIsPopupOpen(true);
    }
  };

function checkBalance(){
      var  timer = setInterval(() => {
          fetchBalance();

          if(newBalance > balance){
            handleCancel();
          }

      return () => {
          clearInterval(timer); // Cleanup on component unmount
      };
      }, 2500); 

}
    
  useEffect(() => {
    if(newBalance > expectedAmount){
      handleSuccess();
    }
    if(newBalance > balance){
    }
  }, [newBalance]);  


  useEffect(() => {
    let timer:any;
    checkBalance();

    if (popup) {
        timer = setInterval(() => {
          
            if (popup.closed) {
                clearInterval(timer);
                setIsPopupOpen(false);
              // check if the payment was successful
              if(balance < expectedAmount){
              //  setError(`Something went wrong with TopUp Process? Don't worry retry another payment method!`)
              onClose()
              setStep(10)
              }
              //if succeessful  setStep(4 and proceed to next step)
            
            }
        }, 1000); // Check every second
    }
      if(balance > expectedAmount){
        clearInterval(timer);
        onClose()
        setStep(2) // back to checkout
      }
      
    return () => {
        clearInterval(timer); // Cleanup on component unmount
    };
  }, [popup]);  



  const ErrorModal: React.FC<ErrorModalProps> = ({
    title,
  }: ErrorModalProps) => {

    return (
      <div className="flex flex-col gap-y-6 items-center content-center w-[100%] p-3">
        <div className="flex gap-x-3 items-center">
          <Image
            quality={100}
            src="/icons/info.svg"
            className="w-10"
            width={40}
            height={40}
            alt="icon"
          />
          <p className="text-[28px] font-extrabold">{title}</p>
        </div>
        <div className="flex flex-col gap-y-2 mb-[56px]">
  
                <div
                  className="text-white/[53%] text-center flex-col azeret-mono-font text-lg lg:text-xl xl:text-[22px] flex items-center gap-x-2 self-start align-text-top break-words"
                  style={{ alignItems: 'self-start' }}
                >
                    <p>
                     {`Dont'worry!`}
                    </p>

                    <p>
                      <strong>
                         {`  `}
                      Please retry with a different payment method
                      </strong>
                    </p>
                  
                </div>
        </div>
        <BaseButton
          title="OK"
          variant="primary"
          onClick={()=>setError('')}
          className="max-w-[210px]"
        />
      </div>
    );
  }

  // view logic
  //if (error!='') return <ErrorModal title="Top Up Not Succefull"  />;

        return (<>
         
          <div className={`flex flex-col gap-y-5 w-full ${isPopupOpen ? "blur-2xl" : ''}`}>
        <Container flex="row" gap="xs" center="both">
          {typeof title === 'string' ? <ModalTitle>{title}</ModalTitle> : title}
        </Container>

      {!pageIsReady ? <FetchingPrice className="mx-auto" />
          :
        <>
        <div className="flex flex-col gap-y-2 items-center">
        <div className="flex gap-x-6 justify-between my-3 px-4">
          <div className="w-1/2 h-1/2 flex justify-center items-center">
          <Image
            src={nftImage}
            quality={100}
            alt="neon-grid"
            className="object-contain rounded-[12px] border border-[#3B3B3B]"
            width={382}
            height={382}
          />
          </div>

          <div className="w-1/2 flex flex-wrap flex-col gap-6 justify-between items-stretch h-full px-6">
          <div className=" flex flex-col justify-start font-manrope text-white text-lg font-medium">
                  <span>Price</span>
                  <span>{expectedAmount} ETH</span>
          </div>
          <div className="flex flex-col justify-start  font-manrope text-white text-lg font-medium">
            <span>Your wallet balance</span>
            <span>{newBalance.toFixed(5)} ETH</span>
            <button onClick={fetchBalance} className="hidden">Refresh Balance</button>

          </div>
          <div className="flex flex-col justify-start font-manrope text-white text-xl font-bold">
            <span>Required</span>
            <span>{(expectedAmount - newBalance).toFixed(5)} ETH</span>
          </div>
          </div>
        </div>
        <div className="flex justify-center items-center mx-auto max-w-md text-[24px] font-manrope text-white text-lg font-medium">
         <p className="justify-start"> You Can Either Send The Required Amount Of Base ETH
          Directly To Your Connected Wallet,
          Or Top Up Instantly Using One Of Our Trusted Onramp
          Partners Below</p>
        </div>

       {quote=='' && <FetchingPrice className="mx-16" />}
       <div className="flex justify-center items-center mx-auto max-w-md text-[24px] font-manrope text-white text-lg font-medium">
           Quote <ThirdwebFundingItem tokenAmount={tokenAmount} /> 
          {/* Quote Coinbase   <CoinbaseFundingItem tokenAmount={tokenAmount} /> **/} 
      </div>

        </div>


        <div className="mx-16 py-6">
            <FundingCardItem fundingType="Coinbase" tokenAmount={tokenAmount} /> 
            <FundingCardItem fundingType="Thirdweb" tokenAmount={tokenAmount} /> 
    { /**  <CoinbaseFundingItem tokenAmount={tokenAmount}  setQuote={setQuote} />  */ } 
        </div>
        


        <div className="flex gap-x-4 justify-center my-3 px-4">
          <BaseButton
            title="Cancel"
            variant="secondary"
            onClick={cancelChanges}
          />
       { /**      <BaseButton
            title="success"
            variant="secondary"
            onClick={handleSuccess}
          /> */ } 
          
        </div>
        </>
      }
      </div>
  {/**:
  <ErrorModal title="Top Up Not Succefull"  />
    } */}</>
    );

  

  return null;
}



