import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Screen, PrimaryButton } from '@/presentation/components/ui';
import { COLORS, SPACING } from '@/presentation/theme';
import { useScanScreenLogic } from '@/presentation/hooks/useScanScreenLogic';
import { log } from '@/infra/logger';

// Components
import { ScanHeader } from '@/presentation/components/scan/ScanHeader';
import { ScanInputArea } from '@/presentation/components/scan/ScanInputArea';
import { ItemDetailCard } from '@/presentation/components/scan/ItemDetailCard';
import { QuantityControl } from '@/presentation/components/scan/QuantityControl';
import { ExceptionSection } from '@/presentation/components/scan/ExceptionSection';
import { CreateItemForm } from '@/presentation/components/scan/CreateItemForm';
import { SuggestionList } from '@/presentation/components/scan/SuggestionList';
import { ScanLastAction } from '@/presentation/components/scan/ScanLastAction';

export default function ScanScreen() {
  const {
    // Context
    router, snapshotId, warehouseName, sessionId, locationId,
    scanMode, setScanMode, locationInfo,

    // Search
    q, setQ, onSubmitQ, handleCameraScan,
    selected, setSelected, suggest, setSuggest,

    // Input
    qty, setQty, mode, setMode, qtyInputRef,

    // Create
    isCreating, setIsCreating, newItemName, setNewItemName, newItemUom, setNewItemUom, onCreateNewItem,

    // Actions
    saving, onSave, fetchActual,

    // Exceptions
    showExceptionModal, setShowExceptionModal,
    exceptions, addException, removeException,

    // Computed
    currentLine, lastAction
  } = useScanScreenLogic();

  if (!snapshotId || !warehouseName || !sessionId || !locationId) {
    return (
      <Screen title="Chưa chọn vị trí">
        <View style={{ padding: SPACING.m, alignItems: 'center', gap: SPACING.m }}>
           <Text style={{ textAlign: 'center', color: COLORS.textSecondary }}>
             Bạn chưa chọn vị trí (Location) để kiểm kê.
           </Text>
           <PrimaryButton label="Chọn vị trí ngay" onPress={() => router.replace('/inventory')} />
        </View>
      </Screen>
    );
  }

  React.useEffect(() => {
    log('SCREEN_SCAN_ENTER');
    return () => log('SCREEN_SCAN_LEAVE');
  }, []);

  const onFinish = () => {
    const hasDraft = !!selected || q.trim().length > 0 || qty.trim().length > 0;
    Alert.alert(
      'Kết thúc kiểm kê?',
      hasDraft
        ? 'Bạn đang nhập dữ liệu chưa lưu. Rời khỏi màn hình sẽ KHÔNG thay đổi dữ liệu đã lưu.'
        : 'Quay lại danh sách vị trí để tiếp tục hoặc xuất báo cáo.',
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Rời mà không lưu',
          style: 'destructive',
          onPress: () => {
            log('SCAN_FINISH');
            router.replace('/inventory');
          },
        },
      ]
    );
  };

  return (
    <Screen
      title="Quét kiểm kê"
      scrollable={false}
      headerRight={
        <Pressable onPress={onFinish} style={styles.finishBtn}>
          <Text style={styles.finishText}>Kết thúc</Text>
        </Pressable>
      }
    >
      <ScanLastAction action={lastAction} />
      
      {/* HEADER */}
      <ScanHeader 
        locationName={locationInfo?.name || ''} 
        locationCode={locationInfo?.code || ''}
        scanMode={scanMode}
        setScanMode={setScanMode}
      />

      {/* INPUT AREA */}
      <ScanInputArea 
        scanMode={scanMode}
        q={q}
        setQ={setQ}
        onSubmitQ={onSubmitQ}
        onCameraScan={handleCameraScan}
        isItemSelected={!!selected}
      />

      {/* MAIN INTERFACE */}
      {selected ? (
        <ScrollView style={{ flex: 1 }}>
          <View style={{ gap: SPACING.m, paddingBottom: 20 }}>
            
            <ItemDetailCard 
                itemCode={selected.itemCode}
                itemName={selected.itemName}
                uom={selected.uom}
                onHandQty={selected.onHandQty}
                currentLine={currentLine}
            />

            <View>
                <QuantityControl 
                    qty={qty}
                    setQty={setQty}
                    mode={mode}
                    setMode={setMode}
                    onSave={onSave}
                    onCancel={() => setSelected(null)}
                    saving={saving}
                    qtyInputRef={qtyInputRef}
                >
                    <ExceptionSection 
                        exceptions={exceptions}
                        onAddException={addException}
                        onRemoveException={removeException}
                        showModal={showExceptionModal}
                        setShowModal={setShowExceptionModal}
                        totalInputQty={Number(qty) || 0}
                    />
                </QuantityControl>
            </View>

          </View>
        </ScrollView>
      ) : isCreating ? (
         <CreateItemForm 
            itemCode={q}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            newItemUom={newItemUom}
            setNewItemUom={setNewItemUom}
            onCancel={() => setIsCreating(false)}
            onCreate={onCreateNewItem}
            loading={saving}
         />
      ) : (
         <SuggestionList 
            suggest={suggest}
            q={q}
            onSelect={(s) => { setSelected(s); fetchActual(s.itemKey); setSuggest([]); setQ(''); }}
            onCreateNew={() => setIsCreating(true)}
         />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  finishBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  finishText: { color: COLORS.warning, fontWeight: '700', fontSize: 13 },
});
