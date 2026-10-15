import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { confirm, notify } from '@/lib/feedback';
import {
  addCategory,
  addProduct,
  deleteCategory,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
  type Product,
} from '@/lib/storage';

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modal states
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([listProducts(), listCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      notify('Could not load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAddProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(categories[0] || 'General');
    setFormDescription('');
    setProductModalVisible(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormDescription(prod.description || '');
    setProductModalVisible(true);
  };

  const saveProductHandler = async () => {
    if (!formName.trim()) {
      notify('Product name is required.');
      return;
    }
    const cat = formCategory.trim() || 'General';

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formName.trim(),
          category: cat,
          description: formDescription.trim() || undefined,
        });
        notify(`Updated ${formName.trim()}`);
      } else {
        await addProduct(formName.trim(), cat, {
          description: formDescription.trim() || undefined,
        });
        notify(`Added ${formName.trim()} to catalog`);
      }
      setProductModalVisible(false);
      await loadData();
    } catch {
      notify('Could not save product.');
    }
  };

  const deleteProductHandler = (prod: Product) => {
    confirm(
      'Delete Product?',
      `Remove "${prod.name}" from the product catalog?`,
      'Delete',
      async () => {
        try {
          await deleteProduct(prod.id);
          notify(`Deleted ${prod.name}`);
          await loadData();
        } catch {
          notify('Could not delete product.');
        }
      }
    );
  };

  const saveCategoryHandler = async () => {
    if (!newCategoryName.trim()) {
      notify('Category name is required.');
      return;
    }
    try {
      await addCategory(newCategoryName.trim());
      notify(`Category "${newCategoryName.trim()}" added.`);
      setNewCategoryName('');
      setCategoryModalVisible(false);
      await loadData();
    } catch {
      notify('Could not add category.');
    }
  };

  const deleteCategoryHandler = (cat: string) => {
    confirm(
      'Delete Category?',
      `Remove category "${cat}"? Products under this category will stay in the catalog.`,
      'Delete',
      async () => {
        try {
          await deleteCategory(cat);
          if (selectedCategory === cat) setSelectedCategory('All');
          notify(`Deleted category ${cat}`);
          await loadData();
        } catch {
          notify('Could not delete category.');
        }
      }
    );
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <Screen>
      <AppHeader
        title="Product Catalog"
        eyebrow="ADMIN SECTION"
        onBack={() => router.back()}
      />

      <ScreenBody contentStyle={styles.container}>
        {/* Top Action Toolbar */}
        <View style={styles.topBar}>
          <View style={styles.searchWrap}>
            <Icon name="search" size={18} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products or category..."
              placeholderTextColor={colors.outline}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')}>
                <Icon name="close" size={16} color={colors.outline} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.actionButtonsRow}>
            <PrimaryButton
              label="+ Add Product"
              icon="add"
              compact
              onPress={openAddProduct}
            />
            <PrimaryButton
              label="+ Category"
              variant="tonal"
              icon="folder"
              compact
              onPress={() => setCategoryModalVisible(true)}
            />
          </View>
        </View>

        {/* Category Filter Chips */}
        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            <Chip
              label="All Products"
              selected={selectedCategory === 'All'}
              onPress={() => setSelectedCategory('All')}
            />
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                selected={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Content list or empty state */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Icon name="shopping_bag" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Products in Catalog Yet</Text>
            <Text style={styles.emptyText}>
              Add your company products and categories here. Once added, sales reps
              can tag them on scanned business cards during expos and field meetings.
            </Text>
            <PrimaryButton
              label="+ Add First Product"
              icon="add"
              onPress={openAddProduct}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="search" size={28} color={colors.outline} />
            <Text style={styles.emptyTitle}>No Matching Products</Text>
            <Text style={styles.emptyText}>
              No products found matching &quot;{search}&quot;.
            </Text>
          </View>
        ) : (
          <View style={styles.productList}>
            {filteredProducts.map((prod) => (
              <View key={prod.id} style={styles.productCard}>
                <View style={styles.productInfoCol}>
                  <View style={styles.productHeaderRow}>
                    <Text style={styles.productName}>{prod.name}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {prod.category}
                      </Text>
                    </View>
                  </View>
                  {prod.description ? (
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {prod.description}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.productActionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${prod.name}`}
                    style={styles.iconBtn}
                    onPress={() => openEditProduct(prod)}
                  >
                    <Icon name="edit" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${prod.name}`}
                    style={styles.iconBtn}
                    onPress={() => deleteProductHandler(prod)}
                  >
                    <Icon name="delete" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScreenBody>

      {/* Add / Edit Product Modal */}
      <Modal
        visible={productModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProductModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setProductModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <Pressable
                onPress={() => setProductModalVisible(false)}
                style={styles.closeBtn}
              >
                <Icon name="close" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Product Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 5 KW Panel, Solar Inverter"
                placeholderTextColor={colors.outline}
                value={formName}
                onChangeText={setFormName}
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              {categories.length > 0 ? (
                <View style={styles.catPickerRow}>
                  {categories.map((c) => (
                    <Pressable
                      key={c}
                      style={[
                        styles.catChoice,
                        formCategory === c && styles.catChoiceActive,
                      ]}
                      onPress={() => setFormCategory(c)}
                    >
                      <Text
                        style={[
                          styles.catChoiceText,
                          formCategory === c && styles.catChoiceTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextInput
                style={[styles.textInput, { marginTop: spacing.xs }]}
                placeholder="Or type a new category..."
                placeholderTextColor={colors.outline}
                value={formCategory}
                onChangeText={setFormCategory}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Specifications, model number, or catalog notes"
                placeholderTextColor={colors.outline}
                multiline
                numberOfLines={2}
                value={formDescription}
                onChangeText={setFormDescription}
              />
            </View>

            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                compact
                onPress={() => setProductModalVisible(false)}
              />
              <PrimaryButton
                label={editingProduct ? 'Save Changes' : 'Create Product'}
                icon="done"
                compact
                onPress={saveProductHandler}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setCategoryModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <Pressable
                onPress={() => setCategoryModalVisible(false)}
                style={styles.closeBtn}
              >
                <Icon name="close" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>New Category Name</Text>
              <View style={styles.newCatRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="e.g. Solar Batteries, Inverters"
                  placeholderTextColor={colors.outline}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <PrimaryButton
                  label="Add"
                  compact
                  onPress={saveCategoryHandler}
                />
              </View>
            </View>

            {categories.length > 0 ? (
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Existing Categories</Text>
                <View style={styles.catList}>
                  {categories.map((c) => (
                    <View key={c} style={styles.catItemRow}>
                      <Text style={styles.catItemName}>{c}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete category ${c}`}
                        onPress={() => deleteCategoryHandler(c)}
                        style={styles.catDeleteBtn}
                      >
                        <Icon name="close" size={14} color={colors.error} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    gap: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...type.body,
    color: colors.onSurface,
    paddingVertical: spacing.xxs,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...type.title,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptyText: {
    ...type.body,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  productList: {
    gap: spacing.sm,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  productInfoCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  productHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  productName: {
    ...type.body,
    fontWeight: '700',
    color: colors.onSurface,
  },
  categoryBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  productDesc: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
  },
  productActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.raised,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...type.title,
    color: colors.onSurface,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    gap: spacing.xxs + 2,
  },
  fieldLabel: {
    ...type.bodySm,
    fontWeight: '600',
    color: colors.onSurface,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...type.body,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  multilineInput: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  catPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  catChoice: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catChoiceActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  catChoiceText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  catChoiceTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  newCatRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  catList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  catItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceLow,
  },
  catItemName: {
    fontSize: 12,
    color: colors.onSurface,
  },
  catDeleteBtn: {
    padding: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
