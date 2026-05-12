import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, ArrowLeft, BookOpen, Calendar, User, ChevronRight } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    preview: string | null;
    author: string;
    published_date: string;
    cover_image: string | null;
}

export default function SmartGuide() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('guide_topics')
                .select('id, title, preview, author, published_date, cover_image')
                .eq('is_enabled', true)
                .order('display_order', { ascending: true });

            if (error) throw error;

            if (data) {
                setArticles(data);
            }
        } catch (error) {
            console.error('Error fetching articles:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #F5FAFD, #FFFFFF)' }}>
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen font-cute" style={{ background: 'linear-gradient(180deg, #F5FAFD, #FFFFFF)' }}>
            {/* Header */}
            <div className="bg-white border-b-4 border-brand-500 sticky top-0 z-10 shadow-soft">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <a
                            href="/"
                            className="p-2 hover:bg-brand-50 rounded-2xl transition-colors group"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-brand-700" />
                        </a>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-brand-500" />
                            <h1 className="text-xl md:text-2xl font-bold text-charcoal-900 font-cute">Peptalk</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {articles.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-soft border border-brand-100">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-2xl font-semibold text-charcoal-900 mb-2 font-cute">
                            No Articles Available Yet
                        </h3>
                        <p className="text-gray-600 font-cute">
                            Check back soon for educational content about peptides.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {articles.map((article) => (
                            <div
                                key={article.id}
                                onClick={() => navigate(`/peptalk/${article.id}`)}
                                className="bg-white rounded-2xl shadow-soft hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group border border-brand-100"
                            >
                                {/* Cover Image */}
                                {article.cover_image ? (
                                    <div className="relative w-full h-48 bg-brand-100 overflow-hidden">
                                        <img
                                            src={article.cover_image}
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                    </div>
                                ) : (
                                    <div className="w-full h-48 bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center">
                                        <BookOpen className="w-12 h-12 text-white opacity-50" />
                                    </div>
                                )}

                                {/* Card Content */}
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-charcoal-900 mb-3 line-clamp-2 group-hover:text-brand-400 transition-colors font-cute">
                                        {article.title}
                                    </h3>

                                    {article.preview && (
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                            {article.preview}
                                        </p>
                                    )}

                                    {/* Meta Information */}
                                    <div className="flex flex-col gap-2 text-xs text-gray-500 mb-4">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-brand-500" />
                                            <span>{article.author}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-brand-500" />
                                            <span>{new Date(article.published_date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}</span>
                                        </div>
                                    </div>

                                    {/* Read More */}
                                    <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm group-hover:gap-3 transition-all">
                                        <span>Read Article</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
