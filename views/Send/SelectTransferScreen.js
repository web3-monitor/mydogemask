import {
  Avatar,
  Box,
  Button,
  Center,
  FlatList,
  HStack,
  Spinner,
  Text,
  Toast,
  VStack,
} from 'native-base';
import { useCallback, useEffect, useState } from 'react';

import { BigButton } from '../../components/Button';
import { ToastRender } from '../../components/ToastRender';
import { MESSAGE_TYPES } from '../../scripts/helpers/constants';
import { getDRC20Inscriptions } from '../../scripts/helpers/doginals';
import { sendMessage } from '../../scripts/helpers/message';
import { getCachedTx } from '../../scripts/helpers/storage';
import { NFT } from '../Transactions/components/NFT';

export const SelectTransferScreen = ({
  setFormPage,
  setFormData,
  formData,
  walletAddress,
  selectedAddressIndex,
  selectedToken,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [nfts, setNFTs] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const results = [];
        await getDRC20Inscriptions(
          walletAddress,
          selectedToken.ticker,
          0,
          results
        );
        // Get output values
        const transfers = await Promise.all(
          results.map(async (nft) => {
            const tx = await getCachedTx(nft.txid);

            return {
              ...nft,
              outputValue: tx.vout[nft.vout].value,
            };
          })
        );
        console.log('transfers', transfers);
        setNFTs(transfers);
      } catch (e) {
        Toast.show({
          title: 'Error',
          description: 'Error loading inscriptions',
          duration: 3000,
          render: () => {
            return (
              <ToastRender
                title='Error'
                description='Error loading inscriptions'
                status='error'
              />
            );
          },
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedToken.ticker, walletAddress]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <NFT
        nft={item}
        index={index}
        onPress={() => {
          setSelectedNFT(item);
        }}
      />
    ),
    []
  );

  const onSubmit = useCallback(() => {
    setLoading(true);
    sendMessage(
      {
        message: MESSAGE_TYPES.CREATE_NFT_TRANSACTION,
        data: { ...selectedNFT, recipientAddress: formData.address.trim() },
      },
      ({ rawTx, fee, amount }) => {
        if (rawTx && fee !== undefined && amount) {
          setFormData({
            ...formData,
            rawTx,
            fee,
            dogeAmount: amount,
          });
          setFormPage('confirmation');
          setLoading(false);
        } else {
          setLoading(false);
          Toast.show({
            title: 'Error',
            description: 'Error creating transaction',
            duration: 3000,
            render: () => {
              return (
                <ToastRender
                  title='Error'
                  description='Error creating transaction'
                  status='error'
                />
              );
            },
          });
        }
      }
    );
  }, [formData, setFormData, setFormPage, selectedNFT]);

  return (
    <Center>
      <Text fontSize='sm' color='gray.500' textAlign='center' mb='8px'>
        <Text fontWeight='semibold' bg='gray.100' px='6px' rounded='md'>
          Wallet {selectedAddressIndex + 1}
        </Text>
        {'  '}
        {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}
      </Text>
      <Text fontSize='xl' pb='4px' textAlign='center' fontWeight='semibold'>
        Sending to
      </Text>
      <HStack alignItems='center' space='12px' pb='28px'>
        <Avatar size='sm' bg='brandYellow.500' _text={{ color: 'gray.800' }}>
          {formData.address.substring(0, 2)}
        </Avatar>
        <Text
          fontSize='md'
          fontWeight='semibold'
          color='gray.500'
          textAlign='center'
        >
          {formData.address.slice(0, 8)}...{formData.address.slice(-4)}
        </Text>
      </HStack>
      <Box flex={1}>
        {!nfts ? (
          <Center pt='40px'>
            <Spinner color='amber.400' />
          </Center>
        ) : nfts?.length < 1 ? (
          <VStack pt='48px' alignItems='center'>
            <Text color='gray.500' pt='24px' pb='32px'>
              No transfers found
            </Text>
          </VStack>
        ) : (
          <Box px='20px'>
            <VStack space='10px'>
              <FlatList
                data={nfts}
                renderItem={renderItem}
                keyExtractor={(item) => item.inscriptionNumber}
                numColumns={2}
              />
            </VStack>
          </Box>
        )}
      </Box>

      <HStack alignItems='center' mt='60px' space='12px'>
        <Button
          variant='unstyled'
          colorScheme='coolGray'
          onPress={() => setFormPage('address')}
        >
          Back
        </Button>
        <BigButton
          onPress={onSubmit}
          type='submit'
          role='button'
          px='28px'
          isDisabled={!selectedNFT}
          loading={loading}
        >
          Next
        </BigButton>
      </HStack>
    </Center>
  );
};
