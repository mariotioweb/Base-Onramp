'use client';
import SlickCarousel from '@/app/components/Carousels/SlickCarousel';
import BidModal from '@/app/components/Modules/nft/BidModal';
import BuyModal from '@/app/components/Modules/nft/BuyModal';
import CancelOrderModal from '@/app/components/Modules/nft/CancelOrderModal';
import EscrowModal from '@/app/components/Modules/nft/EscrowModal';
import EscrowRequestModal from '@/app/components/Modules/nft/EscrowRequestModal';
import PutSaleModal from '@/app/components/Modules/nft/PutSaleModal';
import Quotes from '@/app/components/Modules/nft/Quotes';
import BaseButton from '@/app/components/ui/BaseButton';
import { BaseDialog } from '@/app/components/ui/BaseDialog';
import { useToast } from '@/hooks/use-toast';
import { cn, formatNumberWithCommas } from '@/lib/utils';
import { CreateSellService } from '@/services/legacy/createSellService';
import { FavoriteService } from '@/services/legacy/FavoriteService';
import NftServices from '@/services/legacy/nftService';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { EyeIcon, Heart, SquareArrowOutUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PreparedTransaction } from 'thirdweb';
import { useGlobalContext } from '../../Context/GlobalContext';
import { useNFTDetail } from '../../Context/NFTDetailContext';
import EthereumIcon from '../../Icons/etheriam-icon';
import MenuOption from '../../Icons/nft/menu-option';
import ErrorModal from '../create/ErrorModal';
import { AuctionCurrentPrice } from './auction/AuctionCurrentPrice';
import { AuctionMainCountDown } from './auction/AuctionMainCountDown';
import { AuctionStartingPrice } from './auction/AuctionStartingPrice';
import AuctionStartModal from './auction/AuctionStartModal';
import BurnModal from './BurnModal';
import EditNFTModal from './EditNFTModal';
import { FundingCheckout } from './funding-card/FundingCheckout';
import { RemoveSaleModal } from './progress/RemoveSaleModal';
import { SellerInEscrowModal } from './progress/SellerInEscrowModal';
import { SendbirdChatOpen, SendbirdChatWrapper } from './SendbirdChatWrapper';
import TransferModal from './TransferModal';

const style = {
  borderRadius: '10px',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  height: '100%',
  bgcolor: '#27272780',
  backdropFilter: 'blur(24px)',
  boxShadow: 24,
};

interface IModalStatus {
  quote: boolean;
  remove: boolean;
  resell: boolean;
  buy: boolean;
  release: boolean;
  cancel: boolean;
  escrowRelease: boolean;
  errorModal: boolean;
  nftEdit: boolean;
  nftTransfer: boolean;
  nftBurn: boolean;
  bid: boolean;
  sellerEscrow: boolean;
  auction: boolean;
}

export default function NFTMain({
  fetchNftData,
}: {
  fetchNftData: () => void;
}) {
  const {
    nftId,
    mainImage,
    NFTDetail: data,
    likes,
    setLikes,
    liked,
    setLiked,
    type,
    auction,
  } = useNFTDetail();
  // console.log({ type });
  const [modal, setModal] = useState(false);
  const [views, setViews] = useState(0);
  const [buyStep, setBuyStep] = useState(2);
  const [escrowStep, setEscrowStep] = useState(1);
  const [modalStatus, setModalStatus] = useState<IModalStatus>({
    quote: false,
    remove: false,
    resell: false,
    buy: false,
    release: false,
    cancel: false,
    escrowRelease: false,
    errorModal: false,
    nftEdit: false,
    nftTransfer: false,
    nftBurn: false,
    bid: false,
    sellerEscrow: false,
    auction: false,
  });
  const { user } = useGlobalContext();
  const [step, setStep] = useState(1); // Step state in the parent
  const [error, setError] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const nftService = new NftServices();
  const createSellService = new CreateSellService();
  const favoriteService = new FavoriteService();
  const { toast } = useToast();
  const [fundingTransaction, setFundingTransaction] =
    useState<PreparedTransaction | null>(null);

  const [fundingData, setFundingData] = useState<any>({});

  // sendbird chat state
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatAdmin, setChatAdmin] = useState<boolean>(false);

  console.log('STEP Main', JSON.stringify(buyStep));

  const handleLike = async () => {
    try {
      if (!user) {
        toast({
          title: 'Please login',
          duration: 2000,
          variant: 'destructive',
        });
        return;
      }
      setLiked(!liked);
      if (!liked === true) setLikes(Number(likes) + 1);
      else if (!liked === false) setLikes(Number(likes) - 1);
      setMyLike();
    } catch (error) {
      console.log(error);
    }
  };

  const setMyLike = async () => {
    try {
      await favoriteService.handleLikeNfts({ nftId });
    } catch (error) {
      console.log(error);
    }
  };

  const handleView = async () => {
    try {
      const previosIpAddress = localStorage.getItem('ipAddress');
      const {
        data: { views, ipAddress },
      } = await nftService.addView({
        nftId,
        ip: previosIpAddress,
      });
      localStorage.setItem('ipAddress', ipAddress);
      setViews(views);
    } catch (error) {
      console.log({ error });
    }
  };

  useEffect(() => {
    handleView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nftId]);

  useEffect(() => {
    if (error) {
      setModalStatus({ ...modalStatus, errorModal: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // const backendUrl =
  //   process.env.NEXT_PUBLIC_APP_BACKEND_URL || 'https://api.vault-x.io/api/v2';

  // const nftImage = `${backendUrl}/nft/image?quality=90&url=${mainImage ? mainImage : data.cloudinaryUrl}`;
  const nftImage = mainImage ?? data.cloudinaryUrl;

  return (
    <>
      {error && (
        <>
          <BaseDialog
            className="bg-[#161616] max-h-[80%] overflow-y-auto overflow-x-hidden"
            isOpen={modalStatus.errorModal}
            onClose={(val) => {
              setModalStatus({ ...modalStatus, errorModal: val });
            }}
          >
            <ErrorModal
              title="Error"
              data={error}
              close={() => {
                setModalStatus({ ...modalStatus, errorModal: false });
              }}
            />
          </BaseDialog>
        </>
      )}

      <>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            <div
              className="absolute top-5 right-4 bg-white p-2 cursor-pointer rounded-full z-10"
              onClick={() => setModal(false)}
            >
              <Image
                quality={100}
                src="/icons/delete_icon.svg"
                alt=""
                width={50}
                height={50}
                className="w-6 h-6 fill-black"
              />
            </div>
            <SlickCarousel
              images={[
                data?.cloudinaryUrl,
                ...(data?.attachments ? data.attachments : []),
              ]}
              placeholder={data?.cloudinaryPlaceholderUrl}
            />
          </Box>
        </Modal>
        <div className="grid grid-cols-12 gap-4">
          <div className="w-full relative lg:col-span-6 col-span-12 max-h-[620px] lg:min-h-[683px] aspect-square">
            <Image
              quality={100}
              onClick={() => setModal(true)}
              src={!isImageLoaded ? data.cloudinaryPlaceholderUrl : nftImage}
              // height={683}
              // width={620}
              // quality={100}
              fill
              objectFit="cover"
              alt="hero"
              className="cursor-zoom-in rounded-[20px] object-cover "
              onLoadingComplete={() => setIsImageLoaded(true)}
              onError={() => setIsImageLoaded(true)}
            />
            <div
              onClick={() => handleLike()}
              className="absolute top-4 right-[100px] flex md:px-5 px-4 py-1 md:py-3 backdrop-blur-sm h-12 rounded-full gap-x-1 md:gap-x-3 items-center bg-black/20 cursor-pointer"
            >
              <EthereumIcon />
            </div>
            <div
              onClick={() => handleLike()}
              className="absolute top-4 right-4 flex md:px-5 px-4 py-1 md:py-3 backdrop-blur-sm h-12 rounded-full gap-x-1 md:gap-x-3 items-center bg-black/20 cursor-pointer"
            >
              <span className="font-medium">{likes}</span>
              <div className="checkmark">
                <Heart
                  className={cn(
                    'w-4 md:w-5 h-4 md:h-5',
                    liked ? 'fill-white' : 'stroke-white',
                  )}
                />
              </div>
            </div>
            {nftImage === data?.cloudinaryUrl && (
              <Image
                quality={100}
                alt="rwa"
                src="/images/rwa-logo.svg"
                height={100}
                width={100}
                className="w-20 h-16 absolute bottom-3 right-4"
              />
            )}
          </div>
          <div className="text-white w-full lg:col-span-6 col-span-12 px-3">
            <div className="w-full flex flex-col gap-y-5">
              <div className="flex flex-col gap-y-[30px]">
                <div className="flex flex-col gap-y-[9px]">
                  <div className="flex justify-end">
                    <div className="flex gap-x-4">
                      {/* <Share2 className="w-6 h-6 text-[#919191]" /> */}
                      {user?.wallet == data.owner?.wallet && (
                        <div className="flex items-center cursor-pointer">
                          <Menu>
                            <MenuButton>
                              <MenuOption />
                            </MenuButton>
                            <MenuItems
                              anchor="bottom"
                              className={
                                'border border-[#40 px-34xl:244] py-3 xl:py-[15px] px-[6px] gap-[6px] bg-[#141618] w-[214px] rounded-[8px]'
                              }
                            >
                              <MenuItem>
                                <div
                                  className={
                                    'py-[6px] px-[10px] text-[#fff] text-[14px] cursor-pointer'
                                  }
                                  onClick={() => {
                                    setModalStatus({
                                      ...modalStatus,
                                      nftEdit: true,
                                    });
                                  }}
                                >
                                  Edit RWA
                                </div>
                              </MenuItem>
                              {/* <MenuItem>
                                <div
                                  className={
                                    'py-[6px] px-[10px] text-[#fff] text-[14px] cursor-pointer'
                                  }
                                  onClick={() => {
                                    setModalStatus({
                                      ...modalStatus,
                                      nftTransfer: true,
                                    });
                                  }}
                                >
                                  Transfer RWA
                                </div>
                              </MenuItem> */}
                              <MenuItem>
                                <div
                                  className={
                                    'py-[6px] px-[10px] text-[#fff] text-[14px] cursor-pointer'
                                  }
                                  onClick={() => {
                                    setModalStatus({
                                      ...modalStatus,
                                      nftBurn: true,
                                    });
                                  }}
                                >
                                  Burn RWA
                                </div>
                              </MenuItem>
                              {type === 'remove' && (
                                <MenuItem>
                                  <div
                                    className={
                                      'py-[6px] px-[10px] text-[#fff] text-[14px] cursor-pointer'
                                    }
                                    onClick={() => {
                                      setModalStatus({
                                        ...modalStatus,
                                        auction: true,
                                      });
                                    }}
                                  >
                                    Auction Start
                                  </div>
                                </MenuItem>
                              )}
                            </MenuItems>
                          </Menu>
                          <BaseDialog
                            className="bg-[#161616] max-h-[80%] overflow-y-auto overflow-x-hidden"
                            isOpen={modalStatus.nftEdit}
                            onClose={(val) => {
                              setModalStatus({ ...modalStatus, nftEdit: val });
                            }}
                            modal={true}
                          >
                            <EditNFTModal
                              onClose={() => {
                                setModalStatus({
                                  ...modalStatus,
                                  nftEdit: false,
                                });
                              }}
                              fetchNftData={fetchNftData}
                            />
                          </BaseDialog>
                          <BaseDialog
                            isOpen={modalStatus.nftTransfer}
                            onClose={(val) => {
                              setModalStatus({
                                ...modalStatus,
                                nftTransfer: val,
                              });
                            }}
                            className="bg-[#161616] max-h-[80%] overflow-y-auto overflow-x-hidden"
                            modal={true}
                          >
                            <TransferModal
                              onClose={() => {
                                setModalStatus({
                                  ...modalStatus,
                                  nftTransfer: false,
                                });
                              }}
                              fetchNftData={fetchNftData}
                            />
                          </BaseDialog>
                          <BaseDialog
                            isOpen={modalStatus.nftBurn}
                            onClose={(val) => {
                              setModalStatus({ ...modalStatus, nftBurn: val });
                            }}
                            className="bg-[#161616] max-h-[80%] overflow-y-auto overflow-x-hidden"
                            modal={true}
                          >
                            <BurnModal
                              onClose={() => {
                                setModalStatus({
                                  ...modalStatus,
                                  nftBurn: false,
                                });
                              }}
                            />
                          </BaseDialog>
                          <BaseDialog
                            isOpen={modalStatus.auction}
                            onClose={(val) => {
                              setModalStatus({ ...modalStatus, auction: val });
                            }}
                            className="bg-[#161616] max-h-[80%] overflow-y-auto overflow-x-hidden"
                            modal={true}
                          >
                            <AuctionStartModal
                              onClose={() => {
                                setModalStatus({
                                  ...modalStatus,
                                  auction: false,
                                });
                              }}
                            />
                          </BaseDialog>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[32px] font-extrabold" title={data?.name}>
                    {data.name}
                  </p>
                  <div className="flex justify-between">
                    <div className="flex gap-x-[10px] items-center">
                      <Image
                        quality={100}
                        width={32}
                        height={32}
                        src={data?.owner?.avatar?.url || '/default-logo.png'}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex flex-col gap-y-1 text-sm">
                        <p className="text-[12px] text-white/30 azeret-mono-font">
                          Owned by:
                        </p>
                        <Link
                          href={`/dashboard/profile/${data?.owner?._id}`}
                          target="_blank"
                        >
                          <p className="text-[12px] azeret-mono-font text-[#fff]">
                            {data?.owner?.username}
                          </p>
                        </Link>
                      </div>
                    </div>
                    <div className="flex gap-x-[10px] items-center">
                      <Image
                        quality={100}
                        width={32}
                        height={32}
                        src={data?.mintedBy?.avatar?.url || '/default-logo.png'}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />

                      <div className="flex flex-col gap-y-1 text-sm">
                        <p className="text-[12px] text-white/30 azeret-mono-font">
                          Created by:
                        </p>
                        <Link
                          href={`/dashboard/profile/${data?.mintedBy?._id}`}
                          target="_blank"
                        >
                          <p className="text-[12px] azeret-mono-font text-[#fff]">
                            {data?.mintedBy?.username}
                          </p>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-x-3">
                  <div className="flex gap-x-1 items-center border font-extrabold border-white border-opacity-[12%] text-white px-3 py-2 rounded-xl">
                    <EyeIcon className="w-5 h-5" />
                    <span className="text-white text-sm">
                      {views ? views : 1} View
                    </span>
                  </div>
                  <div className="flex gap-x-1 items-center border font-extrabold border-white border-opacity-[12%] text-white px-3 py-2 rounded-xl">
                    <svg
                      width="18"
                      height="19"
                      viewBox="0 0 18 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.63075 11.825L9 10.25L8.36925 11.825L6.75 11.969L7.98 13.0858L7.6095 14.75L9 13.8657L10.3905 14.75L10.02 13.0858L11.25 11.969L9.63075 11.825ZM4.5 2H13.5V3.5H4.5V2ZM3 5H15V6.5H3V5Z"
                        fill="white"
                      />
                      <path
                        d="M15 9.5V15.5H3V9.5H15ZM15 8H3C2.60218 8 2.22064 8.15804 1.93934 8.43934C1.65804 8.72064 1.5 9.10218 1.5 9.5V15.5C1.5 15.8978 1.65804 16.2794 1.93934 16.5607C2.22064 16.842 2.60218 17 3 17H15C15.3978 17 15.7794 16.842 16.0607 16.5607C16.342 16.2794 16.5 15.8978 16.5 15.5V9.5C16.5 9.10218 16.342 8.72064 16.0607 8.43934C15.7794 8.15804 15.3978 8 15 8Z"
                        fill="white"
                      />
                    </svg>
                    <span className="text-white text-sm">
                      {data.category ? data.category.name : 'N/A'}
                    </span>
                  </div>
                </div>
                {auction && <AuctionMainCountDown />}
              </div>
              <div className="w-full flex flex-col gap-y-1 bg-[#232323] p-6 rounded-[20px]">
                {auction && <AuctionStartingPrice />}
                <div className="items-center grid grid-cols-12 justify-between">
                  <p className="text-xs text-white/60 col-span-8 azeret-mono-font">
                    {'Current Price'}
                  </p>
                  {(type === 'bid' ||
                    type === 'buy' ||
                    type === 'remove' ||
                    type === 'auction') && (
                    <div className="col-span-4">
                      <BaseDialog
                        trigger={
                          <div
                            className="cursor-pointer flex justify-center items-center gap-x-2 h-8 px-3 font-bold py-2 rounded-lg border text-sm border-[#a3a3a3]"
                            onClick={() => {
                              setModalStatus({ ...modalStatus, quote: true });
                            }}
                          >
                            <SquareArrowOutUpRight className="w-4 h-4" />
                            <span>Check Eth Quotes</span>
                          </div>
                        }
                        className="bg-black max-h-[80%] mx-auto overflow-y-auto overflow-x-hidden"
                        isOpen={modalStatus.quote}
                        onClose={(val) => {
                          setModalStatus({ ...modalStatus, quote: val });
                        }}
                        modal={true}
                      >
                        <Quotes
                          gasFee={0.0001}
                          onClose={() => {
                            setModalStatus({ ...modalStatus, quote: false });
                          }}
                        />
                      </BaseDialog>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between w-full">
                  <div className="flex justify-between items-center gap-y-2 w-full mt-2">
                    {(type === 'NotForSale' || type === 'resell') && (
                      <p className="text-[32px] font-extrabold">Owned</p>
                    )}
                    {(type === 'remove' ||
                      type === 'buy' ||
                      (type === '' && data?.saleId?.active)) && (
                      <p className="text-[32px] font-extrabold">
                        $ {formatNumberWithCommas(data.price)}
                      </p>
                    )}
                    {(type === 'inEscrow' ||
                      type === 'anyoneRelease' ||
                      type === 'release' ||
                      type === 'cancelRequested') && (
                      // <p className="text-[32px] font-extrabold">
                      //   {formatNumberWithCommas(data.lastPrice)}{' '}
                      //   {activeChain.nativeCurrency?.symbol}
                      // </p>
                      <p className="text-[32px] font-extrabold">
                        $ {formatNumberWithCommas(data.price)}
                      </p>
                    )}

                    {(type === 'inEscrow' || type === 'release') && (
                      <SendbirdChatOpen
                        isOpen={chatOpen}
                        setIsOpen={setChatOpen}
                        isAdmin={chatAdmin}
                        setIsAdmin={setChatAdmin}
                      />
                    )}

                    {type === 'resell' ? (
                      <div className="flex flex-col gap-x-2 items-center">
                        <BaseDialog
                          className={`bg-black max-h-[80%] mx-auto overflow-y-auto overflow-x-hidden 
                        ${step === 1 ? 'w-[80rem]' : 'w-[38rem]'} 
                        lg:max-w-[100%]`}
                          trigger={
                            <BaseButton
                              title="Put On Sale"
                              variant="primary"
                              className={'rounded-[14px]'}
                              onClick={() => {}}
                            />
                          }
                          isOpen={modalStatus.resell}
                          onClose={(val) => {
                            setModalStatus({ ...modalStatus, resell: val });
                            setStep(1);
                            fetchNftData();
                          }}
                          modal={true}
                        >
                          <PutSaleModal
                            onClose={() => {
                              setModalStatus({ ...modalStatus, resell: false });
                              fetchNftData();
                            }}
                            parentStep={step} // Pass step value here
                            parentSetStep={setStep}
                          />
                        </BaseDialog>
                      </div>
                    ) : null}

                    {type === 'remove' && (
                      <div className="flex flex-col gap-x-2 items-center">
                        <BaseDialog
                          className="bg-black max-h-[80%] w-[38rem] mx-auto overflow-y-auto overflow-x-hidden"
                          trigger={
                            <BaseButton
                              title="Remove From Sale"
                              variant="primary"
                              onClick={() => {
                                setModalStatus({
                                  ...modalStatus,
                                  remove: true,
                                });
                              }}
                              displayIcon="left"
                              iconPath="/icons/cross_ico.svg"
                              className={'!rounded-[14px]'}
                            />
                          }
                          isOpen={modalStatus.remove}
                          onClose={(val) => {
                            setModalStatus({ ...modalStatus, remove: val });
                            fetchNftData();
                          }}
                          modal={true}
                        >
                          <RemoveSaleModal
                            onClose={() => {
                              setModalStatus({ ...modalStatus, remove: false });
                              fetchNftData();
                            }}
                          />
                        </BaseDialog>
                      </div>
                    )}

                    {(type === 'NotForSale' || type === 'bid') && (
                      <div className="flex flex-col gap-x-2 items-center">
                        <BaseDialog
                          isOpen={modalStatus.bid}
                          onClose={(val) => {
                            setModalStatus({ ...modalStatus, bid: val });
                          }}
                          trigger={
                            <BaseButton
                              title="Place a Bid"
                              variant="secondaryOutline"
                              onClick={() => {
                                setModalStatus({ ...modalStatus, bid: true });
                              }}
                            />
                          }
                          className="bg-black max-h-[80%] w-full overflow-y-auto overflow-x-hidden"
                          modal={true}
                        >
                          <BidModal
                            title={data.name}
                            update={() => {}}
                            onClose={() => {
                              setModalStatus({ ...modalStatus, bid: false });
                            }}
                            fetchNftData={fetchNftData}
                          />
                        </BaseDialog>
                      </div>
                    )}
                    {type === 'cancelRequested' ? (
                      <div className="flex flex-col gap-x-2 items-center">
                        <BaseButton
                          title="Cancel Requested"
                          variant="primary"
                          onClick={() => {}}
                          className={'!rounded-[14px]'}
                        />
                      </div>
                    ) : null}

                    {type === 'anyoneRelease' && (
                      <BaseDialog
                        className={cn(
                          'bg-black max-h-[80%] w-[38rem] mx-auto overflow-y-auto overflow-x-hidden',
                          escrowStep === 1 ? 'w-full max-w-[960px]' : '',
                        )}
                        trigger={
                          <BaseButton
                            title="Release Escrow"
                            variant="primary"
                            className={'rounded-[14px]'}
                            onClick={() => {}}
                          />
                        }
                        isOpen={modalStatus.release}
                        onClose={(val) => {
                          setModalStatus({ ...modalStatus, release: val });
                          fetchNftData();
                        }}
                        modal={true}
                      >
                        <EscrowModal
                          onClose={() => {
                            setModalStatus({ ...modalStatus, release: false });
                            fetchNftData();
                          }}
                          step={escrowStep}
                          setStep={setEscrowStep}
                        />
                      </BaseDialog>
                    )}

                    {type === 'dispute' && (
                      <div className="flex flex-col gap-x-2 items-center">
                        <BaseButton
                          title="Release Requested"
                          variant="primary"
                          onClick={() => {}}
                          className={'!rounded-[14px]'}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-y-2 w-full mt-2">
                    {type === 'inEscrow' ? (
                      <div className="flex gap-y-2 gap-2 items-center w-full">
                        <BaseDialog
                          trigger={
                            <BaseButton
                              title="Escrow Release Request"
                              variant="secondaryOutline"
                              className={'!rounded-[14px]'}
                              onClick={() => {}}
                            />
                          }
                          isOpen={modalStatus.escrowRelease}
                          onClose={(val) => {
                            setModalStatus({
                              ...modalStatus,
                              escrowRelease: val,
                            });
                          }}
                          className="bg-[#161616] max-h-[80%] mx-auto overflow-y-auto overflow-x-hidden"
                          modal={true}
                        >
                          <EscrowRequestModal
                            onClose={() => {
                              setModalStatus({
                                ...modalStatus,
                                escrowRelease: false,
                              });
                            }}
                            fetchNftData={fetchNftData}
                          />
                        </BaseDialog>
                        <BaseDialog
                          trigger={
                            <BaseButton
                              title="In Escrow"
                              variant="primary"
                              className={'!rounded-[14px]'}
                              onClick={() => {}}
                            />
                          }
                          isOpen={modalStatus.sellerEscrow}
                          onClose={(val) => {
                            setModalStatus({
                              ...modalStatus,
                              sellerEscrow: val,
                            });
                          }}
                          className="bg-[#161616] max-h-[80%] mx-auto overflow-y-auto overflow-x-hidden"
                          modal={true}
                        >
                          <SellerInEscrowModal
                            onClose={() => {
                              setModalStatus({
                                ...modalStatus,
                                sellerEscrow: false,
                              });
                            }}
                          />
                        </BaseDialog>
                      </div>
                    ) : null}
                    {type === 'buy' ? (
                      <div className="flex gap-y-2 gap-2 items-center w-full">
                        <BaseDialog
                          isOpen={modalStatus.bid}
                          onClose={(val) => {
                            setModalStatus({ ...modalStatus, bid: val });
                          }}
                          trigger={
                            <BaseButton
                              title="Place a Bid"
                              variant="secondaryOutline"
                              className={'!rounded-[14px] w-full'}
                              onClick={() => {
                                setModalStatus({ ...modalStatus, bid: true });
                              }}
                            />
                          }
                          className="bg-black max-h-[80%] w-full overflow-y-auto overflow-x-hidden"
                          modal={true}
                        >
                          <BidModal
                            title={data.name}
                            update={() => {}}
                            onClose={() => {
                              setModalStatus({ ...modalStatus, bid: false });
                            }}
                            fetchNftData={fetchNftData}
                          />
                        </BaseDialog>
                        <BaseDialog
                          trigger={
                            <BaseButton
                              title="Buy Now!"
                              className="!rounded-[14px] w-full"
                              variant="primary"
                              onClick={() => {}}
                            />
                          }
                          className={cn(
                            'bg-[#161616] max-h-[80%] overflow-y-auto overflow-x-hidden md:max-w-5xl max-w-5xl',
                            buyStep === 4 ||
                            buyStep === 9 
                              ? 'md:max-w-[676px] max-w-[676px]'
                              : '',
                            buyStep === 5 ||
                            buyStep === 8 
                              ? 'md:max-w-[750px] max-w-[750px]'
                              : '',
                              buyStep === 2 ||
                              buyStep === 3 ||
                              buyStep === 6 ||
                              buyStep === 7 
                              ? 'md:max-w-[570px] max-w-[570px]'
                              : '',
                          )}
                          isOpen={modalStatus.buy}
                          onClose={(val) => {
                            if(buyStep === 10){
                              setBuyStep(8);
                              return;
                            }
                            setBuyStep(2);//AFTER_RIO avoid privacy now
                            setModalStatus({ ...modalStatus, buy: val });
                          }}
                          modal
                        >
                          <BuyModal
                            onClose={() => {
                            if(buyStep === 8 || buyStep === 9){
                              setBuyStep(2);
                              return;
                            }
                            if(buyStep === 10){
                              setBuyStep(8);
                              return;
                            }
                              setModalStatus({ ...modalStatus, buy: false });
                            }}
                            onTopUp={() => {
                              setModalStatus({ ...modalStatus, buy: false });
                              setBuyStep(8);
                              setModalStatus({ ...modalStatus, buy: true });
                            }}
                            fetchNftData={fetchNftData}
                            step={buyStep}
                            setStep={setBuyStep}
                            setFundingTransaction={setFundingTransaction}
                            setFundingData={setFundingData}
                          />
                        </BaseDialog>
                        <FundingCheckout
                          fetchNftData={fetchNftData}
                          nftId={nftId}
                          fundingTransaction={fundingTransaction}
                          fundingData={fundingData}
                        />
                      </div>
                    ) : null}
                    {type === 'release' ? (
                      <div className="flex  gap-y-2 gap-2 items-center w-full">
                        <BaseDialog
                          className="bg-black max-h-[80%] mx-auto overflow-y-auto overflow-x-hidden"
                          trigger={
                            <BaseButton
                              title="Cancel Order Request"
                              variant="secondaryOutline"
                              className={
                                '!rounded-[14px] w-full text-yellow-400'
                              }
                              onClick={() => {}}
                            />
                          }
                          isOpen={modalStatus.cancel}
                          onClose={(val) => {
                            setModalStatus({ ...modalStatus, cancel: val });
                          }}
                          modal={true}
                        >
                          <CancelOrderModal
                            onClose={() => {
                              setModalStatus({ ...modalStatus, cancel: false });
                            }}
                            fetchNftData={fetchNftData}
                          />
                        </BaseDialog>
                        <BaseDialog
                          className={cn(
                            'bg-black max-h-[80%] w-[38rem] mx-auto overflow-y-auto overflow-x-hidden',
                            escrowStep === 1 ? 'w-full max-w-[960px]' : '',
                          )}
                          trigger={
                            <BaseButton
                              title="Release Escrow"
                              variant="primary"
                              className={'!rounded-[14px] w-full'}
                              onClick={() => {}}
                            />
                          }
                          isOpen={modalStatus.release}
                          onClose={(val) => {
                            setModalStatus({ ...modalStatus, release: val });
                            fetchNftData();
                          }}
                          modal={true}
                        >
                          <EscrowModal
                            onClose={() => {
                              setModalStatus({
                                ...modalStatus,
                                release: false,
                              });
                              fetchNftData();
                              setEscrowStep(1);
                            }}
                            step={escrowStep}
                            setStep={setEscrowStep}
                          />
                        </BaseDialog>
                      </div>
                    ) : null}
                    {(type === 'inEscrow' || type === 'release') && (
                      <SendbirdChatWrapper
                        isOpen={chatOpen}
                        setAdmin={setChatAdmin}
                        isAdmin={chatAdmin}
                      />
                    )}
                  </div>
                  {(type === 'auction' || type === 'auctionBid') && (
                    <AuctionCurrentPrice fetchNftData={fetchNftData} />
                  )}
                </div>
              </div>
              <div className="w-full flex flex-col gap-y-4 bg-[#232323] p-6 rounded-[20px] ">
                <p className="font-extrabold text-sm ">Overview</p>
                <hr className="border-white/[8%]" />
                <div className="grid grid-cols-12 gap-y-3 sm:gap-y-0 w-full gap-x-3 justify-between">
                  <div className="flex flex-col col-span-12 sm:col-span-8 gap-y-[10px]">
                    <div className="flex px-4 py-[15px] lg:px-3 xl:px-4 lg:py-3 xl:py-[15px] rounded-md justify-between  items-center border-[#404040] border-2 bg-gradient-to-bl from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.03)]">
                      <span className="font-extrabold text-white text-sm font-manrope">
                        Artist
                      </span>
                      <span className="text-white/60 font-AzeretMono text-sm justify-self-end">
                        {data.artist}
                      </span>
                    </div>
                    <div className="flex px-4 py-[15px] lg:px-3 xl:px-4 lg:py-3 xl:py-[15px] rounded-md justify-between  items-center border-[#404040] border-2 bg-gradient-to-bl from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.03)]">
                      <span className="font-extrabold text-white text-sm font-manrope">
                        Shipping Country
                      </span>
                      <span className="text-white/60 font-AzeretMono text-sm justify-self-end">
                        {data.saleId
                          ? data.saleId?.sellerShippingId?.country
                          : ''}
                      </span>
                    </div>
                    <div className="flex px-4 py-[15px] lg:px-3 xl:px-4 lg:py-3 xl:py-[15px] rounded-md justify-between  items-center border-[#404040] border-2 bg-gradient-to-bl from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.03)]">
                      <span className="font-extrabold text-white text-sm font-manrope">
                        Royalties
                      </span>
                      <span className="text-white/60 font-AzeretMono text-sm justify-self-end">
                        {data.royalty}%
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col col-span-12 sm:col-span-4 gap-y-3">
                    <div className="flex flex-col gap-y-[11px] px-5 py-5 rounded-md justify-between border-[#404040] border-2 bg-gradient-to-bl from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.03)] h-full ">
                      <p className="font-extrabold text-sm">Size</p>
                      <div className="mt-2 text-sm font-AzeretMono text-white/60">
                        <p className="flex mb-[11px]">
                          <span className="inline-block w-[60px]">Height</span>
                          <span className="text-center w-[30px] inline-block">
                            :
                          </span>
                          <span className="flex-1 text-right">
                            {data?.shippingInformation?.lengths}cm
                          </span>
                        </p>
                        <p className="flex mb-[11px]">
                          <span className="inline-block w-[60px]">Width</span>
                          <span className="text-center w-[30px] inline-block ">
                            :
                          </span>
                          <span className="flex-1 text-right">
                            {data?.shippingInformation?.width}cm
                          </span>
                        </p>
                        <p className="flex mb-[11px]">
                          <span className="inline-block w-[60px]">Depth</span>
                          <span className="text-center w-[30px] inline-block">
                            :
                          </span>
                          <span className="flex-1 text-right">
                            {data?.shippingInformation?.height}cm
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    </>
  );
}
