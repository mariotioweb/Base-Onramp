/* eslint-disable @next/next/no-img-element */
'use client';
import { sendTransactionNotification } from '@/actions/notification';
import { paymentMethodState } from '@/hooks/recoil-state';
import { contract } from '@/lib/contract';
import {
  getPaymentSplitsByTokenId,
  getTokenAmount,
  purchaseAsset,
  purchaseAssetBeforeMint,
} from '@/lib/helper';
import { CreateNftServices } from '@/services/legacy/createNftService';
import { CreateSellService } from '@/services/legacy/createSellService';
import { INFTVoucher } from '@/types';
import { roundToDecimals, trimString } from '@/utils/helpers';
import moment from 'moment';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Address, prepareContractCall, PreparedTransaction } from 'thirdweb';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { NFTPriceCard } from '../../Cards/NFTPriceCard';
import { CreateNFTProvider, useCreateNFT } from '../../Context/CreateNFTContext';
import { useGlobalContext } from '../../Context/GlobalContext';
import { useNFTDetail } from '../../Context/NFTDetailContext';
import ErrorModal from '../create/ErrorModal';
import { AddressTemplate } from './AddressTemplate';
import { FundingModal } from './funding-card';
import { PaymentMethod } from './payment-method';

import {
  useWalletBalance,
} from 'thirdweb/react';

import { client } from '@/lib/client';
import { chain, isDev } from '@/lib/contract';
import { PaymentMethodItem } from './payment-method/PaymentMethodItem';

import { generateOnrampURL } from "@/app/components/utilsOnramp/rampUtils";
import TopupModal from './TopupModal';

import { ethers } from 'ethers';


export default function BuyModal({
  onClose,
  fetchNftData,
  step,
  setStep,
  setFundingTransaction,
  setFundingData,
  onTopUp
}: {
  onClose: () => void;
  fetchNftData: () => void;
  step: number;
  setStep: (value: number) => void;
  setFundingTransaction: (value: PreparedTransaction | null) => void;
  setFundingData: (value: any) => void;
  onTopUp: () => void;
}) {
  const { NFTDetail, nftId: id } = useNFTDetail();
  const { fee } = useGlobalContext();
  const [tokenAmount, setTokenAmount] = useState<string | null>(null);
  const [expectedAmount, setExpectedAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeAccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const payMode = useRecoilValue(paymentMethodState);
  const [splitted, setIsSplitted] = useState<boolean>(false);
  const {
    sellerInfo: { shipping, contact },
    setSellerInfo,
  } = useCreateNFT();


console.log('STEP ', JSON.stringify(step));
console.log('NFT price ', JSON.stringify(NFTDetail.price));

const { data, isLoading, isError } = useWalletBalance({
    client,
    address: activeAccount?.address,
    chain: chain,
  });
  
  const balance1 = Number(
        Number(data?.value) /
          Math.pow(10, Number(data?.decimals)),
      ) || 0;

const [balance, setNewBalance] = useState<number>(balance1);

  const [formData, setFormData] = useState({
    accepted: false,
  });


  useEffect(() => {
    fetchBalance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

        const fetchBalance = async () => {
            try {
              const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
              const provider =  new ethers.JsonRpcProvider(rpc);
              // Get the balance
              const balance1 = await provider.getBalance(activeAccount?.address);
              const balanceInEth = ethers.formatUnits(await balance1.toString() , 'ether') || 0;
              console.log('refreshed balance buy',balanceInEth)
              setNewBalance(Number(balanceInEth));

            } catch (err:any) {
              console.error(err.message);
            }

        };
  const address = activeAccount?.address
    ? activeAccount?.address.slice(0, 6) +
      '...' +
      activeAccount?.address.slice(-4)
    : 'Connect Wallet';

  const checkSplit = async () => {
    const splitDetails = await getPaymentSplitsByTokenId(NFTDetail?.tokenId);
    setIsSplitted(splitDetails.length > 0);
  };

  useEffect(() => {
    checkSplit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const buyNFT = async () => {
    try {
      setStep(3);
      const tokenAmount = await getTokenAmount(
        NFTDetail.price.toString(),
        'Wei',
      );
      const { transactionHash } = await purchaseAsset(
        BigInt(NFTDetail?.tokenId),
        tokenAmount as bigint,
        activeAccount?.address as Address,
        activeAccount,
      );
      const data = {
        nftId: id,
        name: shipping?.name,
        email: shipping?.email,
        country: shipping?.country,
        address: shipping?.address,
        phoneNumber: shipping?.phoneNumber,
        contactInformation: contact?.contactInfo,
        concent: formData.accepted,
        buyHash: transactionHash,
        lastPrice: Number(tokenAmount),
      };
      const saleService = new CreateSellService();
      await saleService.buyItem(data);
      setStep(4);
    } catch (error: any) {
      console.log(error);
      setError(
        typeof error?.message === 'string'
          ? error?.message
          : 'Some error occurred',
      );
      // onClose();
    }
  };

  const buyFreeMint = async () => {
    try {
      setStep(3);
      const voucher: INFTVoucher = JSON.parse(
        NFTDetail.voucher,
        (key, value) => {
          // Check if the value is a number and can be safely converted to BigInt
          if (typeof value === 'number') {
            return BigInt(value);
          }
          return value;
        },
      );

      const tokenAmount = await getTokenAmount(
        NFTDetail.price.toString(),
        'Wei',
      );

      const { tokenId, transactionHash } = await purchaseAssetBeforeMint(
        voucher as Omit<INFTVoucher, 'signature'> & {
          signature: `0x${string}`;
        },
        tokenAmount as bigint,
        activeAccount?.address as Address,
        activeAccount,
      );
      const data = {
        nftId: id,
        name: shipping?.name,
        email: shipping?.email,
        country: shipping?.country,
        address: shipping?.address,
        phoneNumber: shipping?.phoneNumber,
        contactInformation: contact?.contactInfo,
        concent: formData.accepted,
        buyHash: transactionHash,
        lastPrice: Number(tokenAmount),
      };
      const createNftService = new CreateNftServices();
      await createNftService.mintAndSale({
        nftId: NFTDetail?._id,
        mintHash: transactionHash,
        tokenId: Number(tokenId),
      });
      const saleService = new CreateSellService();
      await saleService.buyItem(data);
      setStep(4);
    } catch (error: any) {
      setError(
        typeof error?.message === 'string'
          ? error?.message
          : 'Some error occurred',
      );
      // onClose();
    }
  };

  const purchase = async () => {
    if (payMode === 'crypto') {
      if (NFTDetail.minted) await buyNFT();
      else await buyFreeMint();
    } else if (payMode === 'debitCard') {
      await creditCardPurchase();
    }
    await sendTransactionNotification('purchased', id);
  };

  const creditCardPurchase = async () => {
    // get transaction
    let tokenAmount = 0n;
    if (NFTDetail.minted) {
      tokenAmount = (await getTokenAmount(
        NFTDetail.price.toString(),
        'Wei',
      )) as bigint;

      const transaction = prepareContractCall({
        contract: contract,
        method:
          'function purchaseAsset(uint256 tokenId, address recipient) payable',
        params: [BigInt(NFTDetail?.tokenId), activeAccount?.address as Address],
        value: tokenAmount as bigint,
      });
      setFundingTransaction(transaction);
    } else {
      const voucher: INFTVoucher = JSON.parse(
        NFTDetail.voucher,
        (key, value) => {
          // Check if the value is a number and can be safely converted to BigInt
          if (typeof value === 'number') {
            return BigInt(value);
          }
          return value;
        },
      );

      tokenAmount = (await getTokenAmount(
        NFTDetail.price.toString(),
        'Wei',
      )) as bigint;

      const transaction = prepareContractCall({
        contract,
        method:
          'function purchaseAssetBeforeMint((uint256 curationId, string tokenURI, uint256 price, address royaltyWallet, uint256 royaltyPercentage, address[] paymentWallets, uint256[] paymentPercentages, bytes signature) voucher, address recipient) payable',
        params: [
          voucher as Omit<INFTVoucher, 'signature'> & {
            signature: `0x${string}`;
          },
          activeAccount?.address as Address,
        ],
        value: tokenAmount as bigint,
      });

      setFundingTransaction(transaction);
    }
    setFundingData({
      nftId: id,
      name: shipping?.name,
      email: shipping?.email,
      country: shipping?.country,
      address: shipping?.address,
      phoneNumber: shipping?.phoneNumber,
      contactInformation: contact?.contactInfo,
      concent: formData.accepted,
      minted: NFTDetail.minted,
      lastPrice: Number(tokenAmount),
    });
    setStep(6);
  };

  const checkAmount = async () => {
    const tokenAmount = await getTokenAmount(NFTDetail.price.toString());
    setTokenAmount(tokenAmount as string);
    const expectedAmount = (Number(tokenAmount) * 100) / (100 - fee);
    const expectedAmount2 = Math.round(Number(tokenAmount) * 100000) / 100000;// roundToDecimals(expectedAmount ?? null, 5);
    setExpectedAmount(Number(expectedAmount2));
  //  console.log('expectedAmount:'+expectedAmount2)
  };

  useEffect(() => {
    setSellerInfo({
      shipping: null,
      shippingId: null,
      contactId: null,
      contact: null,
      accepted: false,
      width: null,
      height: null,
      length: null,
      weight: null,
    });
    checkAmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="bg-[#161616]">
      {error ? (
        <ErrorModal
          title="Error"
          data={error}
          close={() => {
            onClose();
          }}
        />
      )
       : (
        <>
          {step === 1 && (
            <AddressTemplate
              title="Buyer Information"
              handleCancel={onClose}
              handleNext={() => {
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <div className="flex flex-col gap-y-6 w-full text-[#fff]">
              <p className="text-[30px] font-extrabold">Checkout</p>
              <p className="text-[16px] azeret-mono-font text-[#858585]">
                You are about to purchase {NFTDetail?.name} from {address}
              </p>
              <NFTPriceCard
                imgUrl={NFTDetail?.cloudinaryUrl}
                name={NFTDetail?.name}
                price={NFTDetail?.price}
              />

             <PaymentMethod balance={balance} tokenAmount={parseFloat(tokenAmount)} />
            
              <div className="flex flex-col gap-y-6 mt-5">
                <div className="flex justify-between items-center text-[16px] azeret-mono-font text-[#FFFFFF]">
                  <span className="text-[16px] azeret-mono-font text-[#FFFFFF]">
                    Price
                  </span>
                  <span>{tokenAmount} ETH</span>
                </div>
                {!splitted && NFTDetail?.royalty && (
                  <div className="flex justify-between py-3 items-center azeret-mono-font">
                    <span>Royalties</span>
                    <span>{NFTDetail.royalty}%</span>
                  </div>
                )}

                {splitted &&
                  NFTDetail?.walletAddresses.map((split, index) => (
                    <div
                      className="flex justify-between py-3 items-center azeret-mono-font"
                      key="index"
                    >
                      <span>Split payment</span>
                      <span>{split.percentage}%</span>
                    </div>
                  ))}
                <div className="flex justify-between items-center text-[16px] azeret-mono-font text-[#FFFFFF]">
                  <span>VaultX Fee</span>
                  <span>{fee} %</span>
                </div>
                <hr />
                <div className="flex justify-between items-center text-[16px] azeret-mono-font text-white text-lg font-bold">
                  <span>You will pay</span>
                  <span>{expectedAmount} ETH</span>
                </div>
                <div className="flex justify-between items-center text-[16px] azeret-mono-font text-white text-lg font-bold">
                  <span>Your wallet balance</span>
                  <span>{balance.toFixed(5)||0} ETH</span>
                </div>
                {balance < expectedAmount && 
                <div className="flex justify-between items-center text-[16px] azeret-mono-font text-red-500 text-lg font-semibold">
                  <span>You need more </span>
                  <span>{(expectedAmount - balance).toFixed(5)||0} ETH</span>
                </div>}

                <div className="flex items-start azeret-mono-font text-white text-base">
                  Gas fee is not included in this statement.
                </div>
              </div>

              <div className="flex justify-between">
                <div className="py-3 w-[48%] rounded-lg text-black font-semibold bg-light">
                  <button
                    className="w-full h-full"
                    onClick={() => {
                      setStep(2);
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <div className={`py-3 w-[48%] rounded-lg text-black bg-neon font-extrabold text-sm`}>
                {balance > expectedAmount ? 
                  <button className="w-full h-full" onClick={purchase}>
                  Checkout
                  </button>
                  :
                  <button className="w-full h-full" onClick={()=>onTopUp()}>
                  Top up Balance
                  </button>
                 } 
                </div>
              </div>
            </div>
          )}
          {step === 3 && (<>
          {balance > expectedAmount ? 
            <div className="flex flex-col gap-y-4 items-center text-center">
              <img
                src="/icons/refresh.svg"
                alt="refresh"
                className="w-20 mx-auto"
              />
              <p className="text-lg font-medium">
                Please wait while purchasing RWA
              </p>
            </div>
            :
            <div className="flex flex-col gap-y-4 items-center text-center">
              <img
                src="/icons/DebitCard.svg"
                alt="DebitCard"
                className="w-20 mx-auto"
              />
              <p className="text-lg font-medium">
                Loading payment methods...
              </p>
            </div>
            }
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-5 justify-center text-center mb-5">
                <Image
                  src="/icons/success.svg"
                  className="w-[115px] h-[115px] mx-auto"
                  alt="success"
                  quality={100}
                  width={115}
                  height={115}
                />
                <p className="text-[30px] text-[#fff] font-extrabold">
                  Payment Success
                </p>
                <p className=" azeret-mono-font text-[#FFFFFF53]">
                  Your payment is completed successfully.
                </p>
              </div>
              <div className="flex flex-col gap-y-3 mb-[20px]">
                <div className="flex justify-between">
                  <div className="w-[48%] p-4 rounded-[9px] border flex flex-col gap-y-2 border-[#FFFFFF14]">
                    <p className=" azeret-mono-font text-[#858585]">From</p>
                    <p className="text-neon azeret-mono-font">
                      {trimString(activeAccount.address)}
                    </p>
                  </div>
                  <div className="w-[48%] p-4 rounded-[9px] border flex flex-col gap-y-2 border-[#FFFFFF14]">
                    <p className=" azeret-mono-font text-[#858585]">To</p>
                    <p className="text-neon azeret-mono-font">
                      {trimString(NFTDetail.owner.wallet)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="w-[48%] p-4 rounded-[9px] border flex flex-col gap-y-2 border-[#FFFFFF14]">
                    <p className=" azeret-mono-font text-[#858585]">
                      Payment Method
                    </p>
                    <p className="text-neon azeret-mono-font">
                      {activeChain.name}
                    </p>
                  </div>
                  <div className="w-[48%] p-4 rounded-[9px] border flex flex-col gap-y-2 border-[#FFFFFF14]">
                    <p className=" azeret-mono-font text-[#858585]">
                      Payment Time
                    </p>
                    <p className="text-neon azeret-mono-font">
                      {moment().format('MM/DD/YYYY, hh:mm:ss A')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-3 w-full rounded-lg text-black font-semibold bg-[#DEE8E8]">
                <button
                  className="w-full h-full bg-[#DEE8E8] font-extrabold text-sm"
                  onClick={() => {
                    setStep(5);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-y-5 w-full">
              <div className="flex gap-x-3 items-center justify-center mb-5">
                <img
                  alt="info"
                  src="/icons/triangle-alert.svg"
                  className="w-24"
                />
              </div>
              <p className="text-xl azeret-mono-font font-extrabold text-center">
                Do not disclose buyer shipping information to third parties!
              </p>
              <p className="azeret-mono-font text-[#858585]">
                To maintain the confidentiality of buyer information and ensure
                smooth transactions, please pay close attention to the following
                points:
                <ol className="list-decimal ml-10 mt-5">
                  <li className="mb-3">
                    Confidentiality of Shipping Information: Buyer shipping
                    information should remain confidential to sellers. Be
                    cautious to prevent any external disclosures.
                  </li>
                  <li className="mb-3">
                    Tips for Safe Transactions: Handle buyer shipping
                    information securely to sustain safe and transparent
                    transactions.
                  </li>
                  <li className="mb-3">
                    Protection of Personal Information: As a seller, it is
                    imperative to treat buyer personal information with utmost
                    care. Avoid disclosing it to third parties.We kindly request
                    your strict adherence to these guidelines to uphold
                    transparency and trust in your transactions. Ensuring a
                    secure transaction environment benefits everyone involved.
                  </li>
                </ol>
              </p>

              <p className="text-white azeret-mono-font text-[18px] font-extrabold text-center">
                Thank You !
              </p>

              <div className="py-3 w-full rounded-lg text-black font-semibold bg-neon">
                <button
                  className="w-full h-full font-extrabold text-sm"
                  onClick={() => {
                    fetchNftData();
                    onClose();
                  }}
                >
                  I Agree
                </button>
              </div>
            </div>
          )}
          {(step === 6 || step === 7) && (
            <FundingModal
              handleCancel={() => {
                setStep(2);
              }}
              handleNext={() => {}}
              tokenAmount={tokenAmount as string}
              nftId={id}
              onClose={onClose}
            />
          )}
           
            {step === 8 && (<>
         <CreateNFTProvider>
              <TopupModal
                title="Insufficient Balance"
    //            data={'Include contents'}
                tokenAmount={tokenAmount}
                expectedAmount={expectedAmount}
                fiatPrice={Number(NFTDetail.price.toString())}
                balance={balance}
                handleCancel={() => {
                  setStep(2);
                }}
                handleSuccess={() => {
                  //setNewBalance(1)
                  fetchBalance()
                  setTimeout(() => {
                    setStep(9);
                  }, 300);
                }}

                onClose={onClose}
                setStep={(e) => {setStep(e)}}
                />
            </CreateNFTProvider>
            </>)
            }
            
            {step === 9 && (
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-5 justify-center text-center mb-5">
                <Image
                  src="/icons/success.svg"
                  className="w-[115px] h-[115px] mx-auto"
                  alt="success"
                  quality={100}
                  width={115}
                  height={115}
                />
                <p className="text-[30px] text-[#fff] font-extrabold">
                  TopUp Success
                </p>
                <p className=" azeret-mono-font text-[#FFFFFF53]">
                  Your TopUp is completed successfully.
                </p>
              </div>
              <div className="py-3 w-full rounded-lg text-black font-semibold bg-[#DEE8E8]">
                <button
                  className="w-full h-full bg-[#DEE8E8] font-extrabold text-sm"
                  onClick={() => {
                    setStep(2);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

    {step === 10 && (
            (
              <ErrorModal
                title="Error"
                data={`Something went wrong! Dont'worry! Please retry later or with a different payment method`}
                close={() => {
                  onClose();
                }}
              />
            )
          )}

        </>
      )}
    </div>
  );
}
