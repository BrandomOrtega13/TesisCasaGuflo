import { useNavigate, useParams } from 'react-router-dom';
import ProductDetailModal from '../components/ProductDetailModal';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <ProductDetailModal
      open={true}
      productId={id ?? null}
      onClose={() => navigate(-1)}
    />
  );
}
